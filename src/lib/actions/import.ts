"use server"

import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import {
  categories,
  categoryRules,
  imports,
  investmentMovements,
  investmentPositions,
  transactions,
} from "@/db/schema"
import { requireUser } from "@/lib/auth-session"
import {
  encMovement,
  encPosition,
  encTransaction,
} from "@/lib/crypto/rows"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { assertAccountOwned, assertCategoryOwned, assertImportOwned } from "@/lib/ownership"
import { saveStatementFile } from "@/lib/storage"
import {
  applyCategoryRules,
  resolveCategoriesFromSource,
  isPasswordError,
  parseStatement,
  PASSWORD_HINT,
  type AccountSourceType,
  type ParsedTransaction,
  type ParsedPosition,
  type ParsedMovement,
} from "@/lib/parsers"

async function requireAuth(): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: string }
> {
  try {
    const { userId } = await requireUser()
    return { userId, ok: true }
  } catch {
    return { ok: false, error: "Não autenticado" }
  }
}

export type PreviewPayload = {
  importId: string
  sourceType: AccountSourceType
  accountId: string
  meta: { parser: string; confidence: string; warnings: string[] }
  transactions: (ParsedTransaction & { category_id?: string | null })[]
  positions: ParsedPosition[]
  movements: ParsedMovement[]
  categories: { id: string; name: string }[]
}

function mapParseError(error: unknown): string {
  if (isPasswordError(error)) return PASSWORD_HINT
  if (error instanceof Error && error.message) return error.message
  return "Falha ao ler arquivo"
}

export async function parseImportAction(formData: FormData): Promise<
  | { error: string }
  | { preview: PreviewPayload }
> {
  const auth = await requireAuth()
  if (!auth.ok) return { error: auth.error }
  const { userId } = auth
  const crypto = await getOrCreateUserCrypto(userId)

  const file = formData.get("file")
  const accountId = String(formData.get("account_id") ?? "")
  const sourceType = String(
    formData.get("source_type") ?? "checking"
  ) as AccountSourceType
  const password = String(formData.get("password") ?? "") || undefined

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." }
  }
  if (!accountId) return { error: "Selecione uma conta." }

  const ownedAccount = await assertAccountOwned(userId, accountId)
  if (!ownedAccount.ok) return { error: ownedAccount.error }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "csv"

  const [importRow] = await db
    .insert(imports)
    .values({
      user_id: userId,
      account_id: accountId,
      source_type: sourceType,
      file_format: ext,
      file_name: crypto.encrypt("file_name", file.name),
      status: "pending",
    })
    .returning({ id: imports.id })

  if (!importRow) {
    return { error: "Falha ao criar importação." }
  }

  const warnings: string[] = []
  let storedPath: string | null = null
  try {
    storedPath = await saveStatementFile(
      userId,
      importRow.id,
      file.name,
      buffer,
      crypto
    )
  } catch (error) {
    warnings.push(
      `Arquivo não foi salvo no storage: ${error instanceof Error ? error.message : "erro"}`
    )
  }

  let parsed
  try {
    parsed = await parseStatement({
      content: buffer,
      fileName: file.name,
      sourceType,
      password,
    })
  } catch (e) {
    const msg = mapParseError(e)
    await db
      .update(imports)
      .set({
        status: "failed",
        error: crypto.encrypt("error", msg),
        file_path: storedPath,
        updated_at: new Date(),
      })
      .where(eq(imports.id, importRow.id))
    return { error: msg }
  }

  const metaWarnings = [...(parsed.meta.warnings ?? []), ...warnings]
  const empty =
    parsed.transactions.length === 0 && parsed.positions.length === 0

  if (empty) {
    const detail =
      metaWarnings.join(" · ") ||
      "Nenhuma linha detectada. Confira o tipo de arquivo e a senha (4 ou 6 primeiros dígitos do CPF)."
    await db
      .update(imports)
      .set({
        status: "failed",
        error: crypto.encrypt("error", detail),
        file_path: storedPath,
        raw_meta: { ...parsed.meta, warnings: metaWarnings },
        updated_at: new Date(),
      })
      .where(eq(imports.id, importRow.id))
    return { error: detail }
  }

  const [rules, categoryRows] = await Promise.all([
    db
      .select({
        id: categoryRules.id,
        match_pattern: categoryRules.match_pattern,
        category_id: categoryRules.category_id,
        priority: categoryRules.priority,
        account_type: categoryRules.account_type,
      })
      .from(categoryRules)
      .where(eq(categoryRules.user_id, userId))
      .orderBy(categoryRules.priority, categoryRules.id)
      .then((rows) =>
        rows.map((r) => ({
          ...r,
          match_pattern:
            crypto.decryptFlex("match_pattern", r.match_pattern) ??
            r.match_pattern,
        }))
      ),
    db
      .select({
        id: categories.id,
        name: categories.name,
        kind: categories.kind,
      })
      .from(categories)
      .where(eq(categories.user_id, userId)),
  ])

  const fromSource = await resolveCategoriesFromSource(
    parsed.transactions,
    categoryRows,
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
        return created?.id ?? null
      } catch {
        return null
      }
    }
  )

  const fromRules = applyCategoryRules(parsed.transactions, rules, sourceType)

  const txnPreview = parsed.transactions.map((t) => ({
    ...t,
    category_id:
      fromSource.get(t.externalHash) ?? fromRules.get(t.externalHash) ?? null,
  }))

  const freshCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.user_id, userId))
    .orderBy(categories.name, categories.id)

  await db
    .update(imports)
    .set({
      status: "parsed",
      file_path: storedPath,
      raw_meta: { ...parsed.meta, warnings: metaWarnings },
      updated_at: new Date(),
    })
    .where(eq(imports.id, importRow.id))

  return {
    preview: {
      importId: importRow.id,
      sourceType,
      accountId,
      meta: { ...parsed.meta, warnings: metaWarnings },
      transactions: txnPreview,
      positions: parsed.positions,
      movements: parsed.movements,
      categories: freshCategories,
    },
  }
}

export async function commitImportAction(payload: {
  importId: string
  accountId: string
  sourceType: AccountSourceType
  transactions: {
    date: string
    description: string
    amount: number
    merchant?: string | null
    installment?: string | null
    sourceCategory?: string | null
    isTransfer?: boolean
    externalHash: string
    category_id?: string | null
  }[]
  positions: ParsedPosition[]
  movements: ParsedMovement[]
}): Promise<{ error?: string; inserted?: number; skipped?: number }> {
  const auth = await requireAuth()
  if (!auth.ok) return { error: auth.error }
  const { userId } = auth
  const crypto = await getOrCreateUserCrypto(userId)

  const ownedImport = await assertImportOwned(userId, payload.importId)
  if (!ownedImport.ok) return { error: ownedImport.error }
  const ownedAccount = await assertAccountOwned(userId, payload.accountId)
  if (!ownedAccount.ok) return { error: ownedAccount.error }

  for (const t of payload.transactions) {
    if (!t.category_id) continue
    const owned = await assertCategoryOwned(userId, t.category_id)
    if (!owned.ok) return { error: owned.error }
  }

  let inserted = 0
  let skipped = 0

  if (payload.transactions.length > 0) {
    const rows = payload.transactions.map((t) => {
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
        account_id: payload.accountId,
        import_id: payload.importId,
        date: t.date,
        description: enc.description,
        amount: enc.amount,
        category_id: t.category_id ?? null,
        merchant: enc.merchant,
        installment: enc.installment,
        external_hash: enc.external_hash,
        source_category: enc.source_category,
        source_type: payload.sourceType,
        is_transfer: Boolean(t.isTransfer),
      }
    })

    try {
      const data = await db
        .insert(transactions)
        .values(rows)
        .onConflictDoNothing({
          target: [transactions.user_id, transactions.external_hash],
        })
        .returning({ id: transactions.id })
      inserted += data.length
      skipped += rows.length - data.length
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao gravar"
      await db
        .update(imports)
        .set({
          status: "failed",
          error: crypto.encrypt("error", message),
          updated_at: new Date(),
        })
        .where(and(eq(imports.id, payload.importId), eq(imports.user_id, userId)))
      return { error: message }
    }
  }

  if (payload.positions.length > 0) {
    const now = new Date()
    const rows = payload.positions.map((p) => {
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
        account_id: payload.accountId,
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

    try {
      await db
        .insert(investmentPositions)
        .values(rows)
        .onConflictDoUpdate({
          target: [
            investmentPositions.user_id,
            investmentPositions.external_hash,
          ],
          set: {
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
            account_id: sql`excluded.account_id`,
          },
        })
      inserted += rows.length
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Falha ao gravar" }
    }
  }

  if (payload.movements.length > 0) {
    const rows = payload.movements.map((m) => {
      const enc = encMovement(crypto, {
        description: m.description ?? null,
        amount: m.amount,
        external_hash: m.externalHash,
      })
      return {
        user_id: userId,
        account_id: payload.accountId,
        import_id: payload.importId,
        date: m.date,
        type: m.type,
        description: enc.description,
        amount: enc.amount,
        external_hash: enc.external_hash,
      }
    })

    try {
      await db
        .insert(investmentMovements)
        .values(rows)
        .onConflictDoNothing({
          target: [
            investmentMovements.user_id,
            investmentMovements.external_hash,
          ],
        })
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Falha ao gravar" }
    }
  }

  await db
    .update(imports)
    .set({ status: "committed", updated_at: new Date() })
    .where(and(eq(imports.id, payload.importId), eq(imports.user_id, userId)))

  revalidatePath("/transacoes")
  revalidatePath("/painel")
  revalidatePath("/investimentos")
  revalidatePath("/importar")

  return { inserted, skipped }
}
