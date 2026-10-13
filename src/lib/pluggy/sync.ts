import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import {
  accounts,
  balanceSnapshots,
  categories,
  categoryRules,
  investmentMovements,
  investmentPositions,
  transactions,
} from "@/db/schema"
import type { UserCrypto } from "@/lib/crypto/codec"
import {
  encAccount,
  encMovement,
  encPosition,
  encTransaction,
} from "@/lib/crypto/rows"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { resolvePluggyItemId } from "@/lib/pluggy/item-store"
import {
  applyCategoryRules,
  resolveCategoriesFromSource,
} from "@/lib/parsers/apply-rules"
import { makeHash } from "@/lib/parsers/normalize"
import type { AccountSourceType, ParsedTransaction } from "@/lib/parsers/types"
import type { AccountType } from "@/lib/types"
import {
  assertItemReady,
  fetchAccounts,
  fetchAllTransactions,
  fetchInvestmentTransactions,
  fetchInvestments,
  fetchItem,
  getApiKey,
  type PluggyAccount,
} from "@/lib/pluggy/client"
import {
  defaultTxnDateFrom,
  mapAccountSourceType,
  mapBalanceForSnapshot,
  mapInvestment,
  mapInvestmentTransaction,
  mapTransaction,
} from "@/lib/pluggy/map"

export type SyncPluggyResult = {
  error?: string
  inserted?: number
  skipped?: number
  positions?: number
  movements?: number
  balances?: number
  accounts?: number
}

function last4FromNumber(number: string | null | undefined): string | null {
  if (!number) return null
  const digits = number.replace(/\D/g, "")
  if (digits.length >= 4) return digits.slice(-4)
  return number.slice(-4) || null
}

async function upsertLocalAccount(
  crypto: UserCrypto,
  userId: string,
  input: {
    pluggyAccountId: string
    name: string
    type: AccountType
    institution: string
    last4: string | null
    currency: string
  }
): Promise<string> {
  const bidx = crypto.blindIndex(input.pluggyAccountId)
  const [byBidx] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(eq(accounts.user_id, userId), eq(accounts.pluggy_account_id_bidx, bidx))
    )
    .limit(1)

  let existing = byBidx
  if (!existing) {
    const [byPlain] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.user_id, userId),
          eq(accounts.pluggy_account_id, input.pluggyAccountId)
        )
      )
      .limit(1)
    existing = byPlain
  }

  const enc = encAccount(crypto, {
    name: input.name,
    institution: input.institution,
    last4: input.last4,
    pluggy_account_id: input.pluggyAccountId,
  })

  if (existing?.id) {
    await db
      .update(accounts)
      .set({
        name: enc.name,
        type: input.type,
        institution: enc.institution,
        last4: enc.last4,
        currency: input.currency,
        pluggy_account_id: enc.pluggy_account_id,
        pluggy_account_id_bidx: enc.pluggy_account_id_bidx,
        is_active: true,
        updated_at: new Date(),
      })
      .where(eq(accounts.id, existing.id))
    return existing.id
  }

  const [created] = await db
    .insert(accounts)
    .values({
      user_id: userId,
      pluggy_account_id: enc.pluggy_account_id,
      pluggy_account_id_bidx: enc.pluggy_account_id_bidx,
      name: enc.name,
      type: input.type,
      institution: enc.institution,
      last4: enc.last4,
      currency: input.currency,
      is_active: true,
    })
    .returning({ id: accounts.id })

  if (!created?.id) {
    throw new Error("Falha ao criar conta local")
  }
  return created.id
}

/**
 * Pull Meu Pluggy Item data into Postgres via Drizzle.
 * Creates/updates one local account per Pluggy account.
 * Admin-context: caller must already scope to PLUGGY_SYNC_USER_ID.
 */
export async function runPluggySync(userId: string): Promise<SyncPluggyResult> {
  const crypto = await getOrCreateUserCrypto(userId)
  let itemId: string
  try {
    itemId = await resolvePluggyItemId(crypto)
  } catch {
    return {
      error: "Configure PLUGGY_ITEM_ID (UUID do Item no Meu Pluggy).",
    }
  }

  let apiKey: string
  try {
    apiKey = await getApiKey()
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Falha na autenticação Pluggy",
    }
  }

  let institution = "Open Finance"
  try {
    const item = await fetchItem(apiKey, itemId)
    assertItemReady(item)
    institution = item.connector?.name?.trim() || institution
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Falha ao verificar Item Pluggy",
    }
  }

  let pluggyAccounts: PluggyAccount[]
  try {
    pluggyAccounts = await fetchAccounts(apiKey, itemId)
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Falha ao listar contas Pluggy",
    }
  }

  const dateFrom = defaultTxnDateFrom()
  const now = new Date()
  const seenPluggyIds = new Set<string>()
  const localByPluggyId = new Map<string, string>()

  let accountsUpserted = 0
  let balances = 0

  for (const acc of pluggyAccounts) {
    const sourceType = mapAccountSourceType(acc)
    if (!sourceType) continue

    try {
      const localId = await upsertLocalAccount(crypto, userId, {
        pluggyAccountId: acc.id,
        name: acc.name || `${institution} ${sourceType}`,
        type: sourceType,
        institution,
        last4: last4FromNumber(acc.number),
        currency: acc.currencyCode || "BRL",
      })
      seenPluggyIds.add(acc.id)
      localByPluggyId.set(acc.id, localId)
      accountsUpserted += 1

      const balance = mapBalanceForSnapshot(acc, sourceType)
      await db
        .insert(balanceSnapshots)
        .values({
          user_id: userId,
          account_id: localId,
          source_type: sourceType,
          balance: crypto.encryptNum("balance", balance),
          pluggy_account_id: crypto.encrypt("pluggy_account_id", acc.id),
          pluggy_account_id_bidx: crypto.blindIndex(acc.id),
          updated_at: now,
        })
        .onConflictDoUpdate({
          target: [balanceSnapshots.user_id, balanceSnapshots.account_id],
          set: {
            source_type: sourceType,
            balance: crypto.encryptNum("balance", balance),
            pluggy_account_id: crypto.encrypt("pluggy_account_id", acc.id),
            pluggy_account_id_bidx: crypto.blindIndex(acc.id),
            updated_at: now,
          },
        })
      balances += 1
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Falha ao sincronizar conta",
      }
    }
  }

  const investPluggyId = `invest:${itemId}`
  let investAccountId: string
  try {
    investAccountId = await upsertLocalAccount(crypto, userId, {
      pluggyAccountId: investPluggyId,
      name: `${institution} — Investimentos`,
      type: "investment",
      institution,
      last4: null,
      currency: "BRL",
    })
    seenPluggyIds.add(investPluggyId)
    accountsUpserted += 1
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Falha ao sincronizar conta de investimentos",
    }
  }

  const linkedAccounts = await db
    .select({
      id: accounts.id,
      pluggy_account_id: accounts.pluggy_account_id,
    })
    .from(accounts)
    .where(and(eq(accounts.user_id, userId), isNotNull(accounts.pluggy_account_id)))

  for (const row of linkedAccounts) {
    const pid = crypto.decryptFlex("pluggy_account_id", row.pluggy_account_id)
    if (pid && !seenPluggyIds.has(pid)) {
      await db
        .update(accounts)
        .set({ is_active: false, updated_at: now })
        .where(eq(accounts.id, row.id))
    }
  }

  const [rules, categoryRows] = await Promise.all([
    db
      .select({
        match_pattern: categoryRules.match_pattern,
        category_id: categoryRules.category_id,
        priority: categoryRules.priority,
        account_type: categoryRules.account_type,
      })
      .from(categoryRules)
      .where(eq(categoryRules.user_id, userId))
      .orderBy(categoryRules.priority),
    db
      .select({
        id: categories.id,
        name: categories.name,
        kind: categories.kind,
      })
      .from(categories)
      .where(eq(categories.user_id, userId)),
  ])

  const categoryList = [...categoryRows]
  let inserted = 0
  let skipped = 0

  for (const acc of pluggyAccounts) {
    const sourceType = mapAccountSourceType(acc)
    if (!sourceType || sourceType === "investment") continue
    const accountId = localByPluggyId.get(acc.id)
    if (!accountId) continue

    let rawTxns
    try {
      rawTxns = await fetchAllTransactions(apiKey, acc.id, dateFrom)
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? e.message
            : `Falha ao buscar transações (${acc.name})`,
      }
    }

    const posted = rawTxns.filter((t) => t.status !== "PENDING")
    const parsed: ParsedTransaction[] = posted.map((t) =>
      mapTransaction(t, sourceType)
    )
    if (parsed.length === 0) continue

    const fromSource = await resolveCategoriesFromSource(
      parsed,
      categoryList,
      async (name, kind) => {
        try {
          const [created] = await db
            .insert(categories)
            .values({
              user_id: userId,
              name,
              kind: kind as "income" | "expense" | "transfer",
            })
            .returning({ id: categories.id })
          if (!created) return null
          categoryList.push({
            id: created.id,
            name,
            kind: kind as "income" | "expense" | "transfer",
          })
          return created.id
        } catch {
          return null
        }
      }
    )

    const fromRules = applyCategoryRules(
      parsed,
      rules.map((r) => ({
        ...r,
        match_pattern:
          crypto.decryptFlex("match_pattern", r.match_pattern) ??
          r.match_pattern,
      })),
      sourceType as AccountSourceType
    )

    const rows = parsed.map((t) => {
      const enc = encTransaction(crypto, {
        description: t.description,
        amount: t.amount,
        merchant: t.merchant ?? null,
        installment: t.installment ?? null,
        source_category: t.sourceCategory ?? null,
        external_hash: t.externalHash,
      })
      return {
        user_id: userId,
        account_id: accountId,
        import_id: null,
        date: t.date,
        description: enc.description,
        amount: enc.amount,
        category_id:
          fromSource.get(t.externalHash) ??
          fromRules.get(t.externalHash) ??
          null,
        merchant: enc.merchant,
        installment: enc.installment,
        external_hash: enc.external_hash,
        source_category: enc.source_category,
        source_type: sourceType,
        is_transfer: Boolean(t.isTransfer),
        updated_at: now,
      }
    })

    try {
      const data = await db
        .insert(transactions)
        .values(rows)
        .onConflictDoUpdate({
          target: [transactions.user_id, transactions.external_hash],
          set: {
            account_id: sql`excluded.account_id`,
            date: sql`excluded.date`,
            description: sql`excluded.description`,
            amount: sql`excluded.amount`,
            category_id: sql`excluded.category_id`,
            merchant: sql`excluded.merchant`,
            installment: sql`excluded.installment`,
            source_category: sql`excluded.source_category`,
            source_type: sql`excluded.source_type`,
            is_transfer: sql`excluded.is_transfer`,
            updated_at: now,
          },
        })
        .returning({ id: transactions.id })
      inserted += data.length
      skipped += Math.max(0, rows.length - data.length)
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Falha ao gravar transações",
      }
    }
  }

  let positions = 0
  let movements = 0

  let investments
  try {
    investments = await fetchInvestments(apiKey, itemId)
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Falha ao buscar investimentos",
    }
  }

  const mappedPositions = investments
    .map(mapInvestment)
    .filter((p): p is NonNullable<typeof p> => p != null)

  const positionRows = mappedPositions.map((p) => {
    const enc = encPosition(crypto, {
      ticker: p.ticker ?? null,
      asset_name: p.assetName,
      quantity: p.quantity,
      avg_price: p.avgPrice,
      current_price: p.currentPrice,
      rate: p.rate,
      rate_type: p.rateType,
      amount_original: p.amountOriginal,
      amount_withdrawal: p.amountWithdrawal,
      external_hash: p.externalHash,
    })
    return {
      user_id: userId,
      account_id: investAccountId,
      ticker: enc.ticker,
      asset_name: enc.asset_name,
      asset_class: p.assetClass,
      quantity: enc.quantity,
      avg_price: enc.avg_price,
      current_price: enc.current_price,
      as_of: p.asOf,
      purchase_date: p.purchaseDate ?? null,
      rate: enc.rate,
      rate_type: enc.rate_type,
      amount_original: enc.amount_original,
      amount_withdrawal: enc.amount_withdrawal,
      external_hash: enc.external_hash,
      is_active: true,
      updated_at: now,
    }
  })

  if (positionRows.length > 0) {
    try {
      await db
        .insert(investmentPositions)
        .values(positionRows)
        .onConflictDoUpdate({
          target: [
            investmentPositions.user_id,
            investmentPositions.external_hash,
          ],
          set: {
            account_id: sql`excluded.account_id`,
            ticker: sql`excluded.ticker`,
            asset_name: sql`excluded.asset_name`,
            asset_class: sql`excluded.asset_class`,
            quantity: sql`excluded.quantity`,
            avg_price: sql`excluded.avg_price`,
            current_price: sql`excluded.current_price`,
            as_of: sql`excluded.as_of`,
            purchase_date: sql`excluded.purchase_date`,
            rate: sql`excluded.rate`,
            rate_type: sql`excluded.rate_type`,
            amount_original: sql`excluded.amount_original`,
            amount_withdrawal: sql`excluded.amount_withdrawal`,
            is_active: true,
            updated_at: now,
          },
        })
      positions = positionRows.length
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Falha ao gravar posições",
      }
    }
  }

  const syncedHashes = new Set(positionRows.map((p) => p.external_hash))
  const investAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.user_id, userId), eq(accounts.type, "investment")))

  const investAccountIds = [
    ...new Set([investAccountId, ...investAccounts.map((a) => a.id)]),
  ]

  const existingPositions =
    investAccountIds.length > 0
      ? await db
          .select({
            id: investmentPositions.id,
            external_hash: investmentPositions.external_hash,
          })
          .from(investmentPositions)
          .where(
            and(
              eq(investmentPositions.user_id, userId),
              eq(investmentPositions.is_active, true),
              inArray(investmentPositions.account_id, investAccountIds)
            )
          )
      : []

  const staleIds = existingPositions
    .filter((p) => !syncedHashes.has(p.external_hash))
    .map((p) => p.id)

  if (staleIds.length > 0) {
    await db
      .update(investmentPositions)
      .set({ is_active: false, updated_at: now })
      .where(inArray(investmentPositions.id, staleIds))
  }

  const positionIdByHash = new Map<string, string>()
  if (positionRows.length > 0) {
    const hashes = positionRows.map((p) => p.external_hash)
    const positionIds = await db
      .select({
        id: investmentPositions.id,
        external_hash: investmentPositions.external_hash,
      })
      .from(investmentPositions)
      .where(
        and(
          eq(investmentPositions.user_id, userId),
          inArray(investmentPositions.external_hash, hashes)
        )
      )

    for (const p of positionIds) {
      positionIdByHash.set(p.external_hash, p.id)
    }
  }

  for (const inv of investments) {
    let invTxns
    try {
      invTxns = await fetchInvestmentTransactions(apiKey, inv.id)
    } catch {
      continue
    }
    const positionHash = crypto.blindIndex(makeHash("pluggy-inv", inv.id))
    const positionId = positionIdByHash.get(positionHash) ?? null
    const movementRows = invTxns.map(mapInvestmentTransaction).map((m) => {
      const enc = encMovement(crypto, {
        description: m.description ?? null,
        amount: m.amount,
        external_hash: m.externalHash,
      })
      return {
        user_id: userId,
        account_id: investAccountId,
        position_id: positionId,
        import_id: null,
        date: m.date,
        type: m.type,
        description: enc.description,
        amount: enc.amount,
        external_hash: enc.external_hash,
      }
    })
    if (movementRows.length === 0) continue
    try {
      await db
        .insert(investmentMovements)
        .values(movementRows)
        .onConflictDoUpdate({
          target: [
            investmentMovements.user_id,
            investmentMovements.external_hash,
          ],
          set: {
            account_id: sql`excluded.account_id`,
            position_id: sql`excluded.position_id`,
            date: sql`excluded.date`,
            type: sql`excluded.type`,
            description: sql`excluded.description`,
            amount: sql`excluded.amount`,
          },
        })
      movements += movementRows.length
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Falha ao gravar movimentações",
      }
    }
  }

  const investTotal = mappedPositions.reduce((s, p) => {
    if (
      p.amountWithdrawal != null &&
      Number.isFinite(Number(p.amountWithdrawal))
    ) {
      return s + Number(p.amountWithdrawal)
    }
    return s + Number(p.quantity) * Number(p.currentPrice)
  }, 0)
  try {
    await db
      .insert(balanceSnapshots)
      .values({
        user_id: userId,
        account_id: investAccountId,
        source_type: "investment",
        balance: crypto.encryptNum("balance", investTotal),
        pluggy_account_id: crypto.encrypt("pluggy_account_id", investPluggyId),
        pluggy_account_id_bidx: crypto.blindIndex(investPluggyId),
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: [balanceSnapshots.user_id, balanceSnapshots.account_id],
        set: {
          source_type: "investment",
          balance: crypto.encryptNum("balance", investTotal),
          pluggy_account_id: crypto.encrypt("pluggy_account_id", investPluggyId),
          pluggy_account_id_bidx: crypto.blindIndex(investPluggyId),
          updated_at: now,
        },
      })
    balances += 1
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao gravar saldo",
    }
  }

  revalidatePath("/painel")
  revalidatePath("/transacoes")
  revalidatePath("/investimentos")

  return {
    inserted,
    skipped,
    positions,
    movements,
    balances,
    accounts: accountsUpserted,
  }
}
