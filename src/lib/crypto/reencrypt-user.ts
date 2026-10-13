import { and, eq } from "drizzle-orm"
import { readdir } from "node:fs/promises"
import path from "node:path"
import { db } from "@/db"
import {
  accounts,
  balanceSnapshots,
  budgets,
  categoryRules,
  goals,
  imports,
  investmentMovements,
  investmentPositions,
  pluggyConnections,
  profiles,
  transactions,
} from "@/db/schema"
import type { UserCrypto } from "./codec"
import { isEnvelope } from "./envelope"
import {
  encryptStatementFileInPlace,
  readStatementFile,
  saveStatementFile,
  storageRoot,
} from "@/lib/storage"

export type ReencryptStats = {
  updated: number
  skipped: number
  filesEncrypted: number
}

function hashNeedsBidx(value: string): boolean {
  return value.length !== 64 || !/^[0-9a-f]+$/i.test(value)
}

async function walkFiles(absDir: string, prefix: string): Promise<string[]> {
  const out: string[] = []
  let entries
  try {
    entries = await readdir(absDir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const abs = path.join(absDir, entry.name)
    const rel = path.posix.join(prefix, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(abs, rel)))
    } else if (entry.isFile() && !entry.name.endsWith(".enc-tmp")) {
      out.push(rel)
    }
  }
  return out
}

type Mode = "backfill" | "rotate"

export async function reencryptUserData(
  from: UserCrypto,
  to: UserCrypto,
  mode: Mode
): Promise<ReencryptStats> {
  if (from.userId !== to.userId) {
    throw new Error("Cannot re-encrypt across users")
  }
  const userId = from.userId
  let updated = 0
  let skipped = 0

  const force = mode === "rotate"

  const touchText = (
    column: string,
    value: string | null | undefined
  ): { next: string | null; changed: boolean } => {
    if (value == null) return { next: value ?? null, changed: false }
    if (!force && isEnvelope(value)) return { next: value, changed: false }
    const plain = from.decryptFlex(column, value) ?? ""
    return { next: to.encrypt(column, plain), changed: true }
  }

  const touchNum = (
    column: string,
    value: string | null | undefined
  ): { next: string | null; changed: boolean } => {
    if (value == null) return { next: null, changed: false }
    if (!force && isEnvelope(value)) return { next: value, changed: false }
    const n = from.decryptNum(column, value)
    return { next: to.encryptNum(column, n), changed: true }
  }

  const touchHash = (
    value: string
  ): { next: string; changed: boolean } => {
    if (mode === "rotate" || !hashNeedsBidx(value)) {
      return { next: value, changed: false }
    }
    return { next: to.blindIndex(value), changed: true }
  }

  const accountRows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.user_id, userId))
  for (const row of accountRows) {
    const name = touchText("name", row.name)
    const institution = touchText("institution", row.institution)
    const last4 = touchText("last4", row.last4)
    const pid = touchText("pluggy_account_id", row.pluggy_account_id)
    const plainPid = from.decryptFlex(
      "pluggy_account_id",
      row.pluggy_account_id
    )
    const bidx = plainPid ? to.blindIndex(plainPid) : null
    const bidxChanged = bidx !== row.pluggy_account_id_bidx
    if (
      name.changed ||
      institution.changed ||
      last4.changed ||
      pid.changed ||
      bidxChanged
    ) {
      await db
        .update(accounts)
        .set({
          name: name.next ?? row.name,
          institution: institution.next ?? row.institution,
          last4: last4.next,
          pluggy_account_id: pid.next,
          pluggy_account_id_bidx: bidx,
        })
        .where(eq(accounts.id, row.id))
      updated += 1
    } else {
      skipped += 1
    }
  }

  const txnRows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.user_id, userId))
  for (const row of txnRows) {
    const description = touchText("description", row.description)
    const amount = touchNum("amount", row.amount)
    const merchant = touchText("merchant", row.merchant)
    const installment = touchText("installment", row.installment)
    const notes = touchText("notes", row.notes)
    const sourceCategory = touchText("source_category", row.source_category)
    const hash = touchHash(row.external_hash)
    if (
      description.changed ||
      amount.changed ||
      merchant.changed ||
      installment.changed ||
      notes.changed ||
      sourceCategory.changed ||
      hash.changed
    ) {
      await db
        .update(transactions)
        .set({
          description: description.next ?? row.description,
          amount: amount.next ?? row.amount,
          merchant: merchant.next,
          installment: installment.next,
          notes: notes.next,
          source_category: sourceCategory.next,
          external_hash: hash.next,
        })
        .where(eq(transactions.id, row.id))
      updated += 1
    } else skipped += 1
  }

  const posRows = await db
    .select()
    .from(investmentPositions)
    .where(eq(investmentPositions.user_id, userId))
  for (const row of posRows) {
    const ticker = touchText("ticker", row.ticker)
    const assetName = touchText("asset_name", row.asset_name)
    const quantity = touchNum("quantity", row.quantity)
    const avg = touchNum("avg_price", row.avg_price)
    const cur = touchNum("current_price", row.current_price)
    const rate = touchNum("rate", row.rate)
    const rateType = touchText("rate_type", row.rate_type)
    const orig = touchNum("amount_original", row.amount_original)
    const wd = touchNum("amount_withdrawal", row.amount_withdrawal)
    const hash = touchHash(row.external_hash)
    if (
      ticker.changed ||
      assetName.changed ||
      quantity.changed ||
      avg.changed ||
      cur.changed ||
      rate.changed ||
      rateType.changed ||
      orig.changed ||
      wd.changed ||
      hash.changed
    ) {
      await db
        .update(investmentPositions)
        .set({
          ticker: ticker.next,
          asset_name: assetName.next ?? row.asset_name,
          quantity: quantity.next ?? row.quantity,
          avg_price: avg.next ?? row.avg_price,
          current_price: cur.next ?? row.current_price,
          rate: rate.next,
          rate_type: rateType.next,
          amount_original: orig.next,
          amount_withdrawal: wd.next,
          external_hash: hash.next,
        })
        .where(eq(investmentPositions.id, row.id))
      updated += 1
    } else skipped += 1
  }

  const movRows = await db
    .select()
    .from(investmentMovements)
    .where(eq(investmentMovements.user_id, userId))
  for (const row of movRows) {
    const description = touchText("description", row.description)
    const amount = touchNum("amount", row.amount)
    const hash = touchHash(row.external_hash)
    if (description.changed || amount.changed || hash.changed) {
      await db
        .update(investmentMovements)
        .set({
          description: description.next,
          amount: amount.next ?? row.amount,
          external_hash: hash.next,
        })
        .where(eq(investmentMovements.id, row.id))
      updated += 1
    } else skipped += 1
  }

  const snapRows = await db
    .select()
    .from(balanceSnapshots)
    .where(eq(balanceSnapshots.user_id, userId))
  for (const row of snapRows) {
    const balance = touchNum("balance", row.balance)
    const pid = touchText("pluggy_account_id", row.pluggy_account_id)
    const plainPid = from.decryptFlex(
      "pluggy_account_id",
      row.pluggy_account_id
    )
    const bidx = plainPid ? to.blindIndex(plainPid) : null
    const bidxChanged = bidx !== row.pluggy_account_id_bidx
    if (balance.changed || pid.changed || bidxChanged) {
      await db
        .update(balanceSnapshots)
        .set({
          balance: balance.next ?? row.balance,
          pluggy_account_id: pid.next,
          pluggy_account_id_bidx: bidx,
        })
        .where(
          and(
            eq(balanceSnapshots.user_id, userId),
            eq(balanceSnapshots.account_id, row.account_id)
          )
        )
      updated += 1
    } else skipped += 1
  }

  const budgetRows = await db
    .select()
    .from(budgets)
    .where(eq(budgets.user_id, userId))
  for (const row of budgetRows) {
    const limit = touchNum("limit_amount", row.limit_amount)
    if (limit.changed) {
      await db
        .update(budgets)
        .set({ limit_amount: limit.next ?? row.limit_amount })
        .where(eq(budgets.id, row.id))
      updated += 1
    } else skipped += 1
  }

  const goalRows = await db.select().from(goals).where(eq(goals.user_id, userId))
  for (const row of goalRows) {
    const name = touchText("name", row.name)
    const target = touchNum("target_amount", row.target_amount)
    const current = touchNum("current_amount", row.current_amount)
    if (name.changed || target.changed || current.changed) {
      await db
        .update(goals)
        .set({
          name: name.next ?? row.name,
          target_amount: target.next ?? row.target_amount,
          current_amount: current.next ?? row.current_amount,
        })
        .where(eq(goals.id, row.id))
      updated += 1
    } else skipped += 1
  }

  const ruleRows = await db
    .select()
    .from(categoryRules)
    .where(eq(categoryRules.user_id, userId))
  for (const row of ruleRows) {
    const pattern = touchText("match_pattern", row.match_pattern)
    if (pattern.changed) {
      await db
        .update(categoryRules)
        .set({ match_pattern: pattern.next ?? row.match_pattern })
        .where(eq(categoryRules.id, row.id))
      updated += 1
    } else skipped += 1
  }

  const importRows = await db
    .select()
    .from(imports)
    .where(eq(imports.user_id, userId))
  for (const row of importRows) {
    const fileName = touchText("file_name", row.file_name)
    const error = touchText("error", row.error)
    if (fileName.changed || error.changed) {
      await db
        .update(imports)
        .set({ file_name: fileName.next, error: error.next })
        .where(eq(imports.id, row.id))
      updated += 1
    } else skipped += 1
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)
  if (profile) {
    const nome = touchText("nome", profile.nome)
    if (nome.changed) {
      await db
        .update(profiles)
        .set({ nome: nome.next })
        .where(eq(profiles.id, userId))
      updated += 1
    } else skipped += 1
  }

  const [pluggy] = await db
    .select()
    .from(pluggyConnections)
    .where(eq(pluggyConnections.user_id, userId))
    .limit(1)
  if (pluggy) {
    const itemId = touchText("item_id", pluggy.item_id)
    if (itemId.changed) {
      await db
        .update(pluggyConnections)
        .set({ item_id: itemId.next ?? pluggy.item_id, updated_at: new Date() })
        .where(eq(pluggyConnections.user_id, userId))
      updated += 1
    } else skipped += 1
  } else if (process.env.PLUGGY_ITEM_ID && process.env.PLUGGY_SYNC_USER_ID === userId) {
    await db.insert(pluggyConnections).values({
      user_id: userId,
      item_id: to.encrypt("item_id", process.env.PLUGGY_ITEM_ID),
    })
    updated += 1
  }

  let filesEncrypted = 0
  const files = await walkFiles(
    path.join(storageRoot(), userId),
    userId
  )
  for (const rel of files) {
    if (mode === "backfill") {
      const changed = await encryptStatementFileInPlace(rel, to)
      if (changed) filesEncrypted += 1
    } else {
      const plain = await readStatementFile(rel, from)
      const parts = rel.split("/")
      const importId = parts[1] ?? "file"
      const fileName = parts.slice(2).join("/") || "file"
      await saveStatementFile(userId, importId, fileName, plain, to)
      filesEncrypted += 1
    }
  }

  return { updated, skipped, filesEncrypted }
}

export async function verifyUserEncrypted(crypto: UserCrypto): Promise<string[]> {
  const leftover: string[] = []
  const check = (label: string, value: string | null | undefined) => {
    if (value && !isEnvelope(value)) leftover.push(label)
  }
  const txns = await db
    .select({ id: transactions.id, amount: transactions.amount, description: transactions.description })
    .from(transactions)
    .where(eq(transactions.user_id, crypto.userId))
  for (const t of txns) {
    check(`transactions.${t.id}.amount`, t.amount)
    check(`transactions.${t.id}.description`, t.description)
  }
  return leftover
}
