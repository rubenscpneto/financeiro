"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/server"
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

async function requireUser(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims?.sub) return { ok: false, error: "Não autenticado" }
  return { supabase, userId: data.claims.sub as string, ok: true }
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
  const auth = await requireUser()
  if (!auth.ok) return { error: auth.error }
  const { supabase, userId } = auth

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

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "csv"

  const { data: importRow, error: importError } = await supabase
    .from("imports")
    .insert({
      user_id: userId,
      account_id: accountId,
      source_type: sourceType,
      file_format: ext,
      file_name: file.name,
      status: "pending",
    })
    .select("id")
    .single()

  if (importError || !importRow) {
    return { error: importError?.message ?? "Falha ao criar importação." }
  }

  const path = `${userId}/${importRow.id}/${file.name}`
  const warnings: string[] = []

  const { error: uploadError } = await supabase.storage
    .from("statements")
    .upload(path, buffer, {
      contentType: "application/octet-stream",
      upsert: true,
    })

  if (uploadError) {
    warnings.push(`Arquivo não foi salvo no storage: ${uploadError.message}`)
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
    await supabase
      .from("imports")
      .update({
        status: "failed",
        error: msg,
        file_path: uploadError ? null : path,
      })
      .eq("id", importRow.id)
    return { error: msg }
  }

  const metaWarnings = [...(parsed.meta.warnings ?? []), ...warnings]
  const empty =
    parsed.transactions.length === 0 && parsed.positions.length === 0

  if (empty) {
    const detail =
      metaWarnings.join(" · ") ||
      "Nenhuma linha detectada. Confira o tipo de arquivo e a senha (4 ou 6 primeiros dígitos do CPF)."
    await supabase
      .from("imports")
      .update({
        status: "failed",
        error: detail,
        file_path: uploadError ? null : path,
        raw_meta: { ...parsed.meta, warnings: metaWarnings },
      })
      .eq("id", importRow.id)
    return { error: detail }
  }

  const [{ data: rules }, { data: categories }] = await Promise.all([
    supabase
      .from("category_rules")
      .select("match_pattern, category_id, priority, account_type")
      .eq("user_id", userId)
      .order("priority", { ascending: true }),
    supabase.from("categories").select("id, name, kind").eq("user_id", userId),
  ])

  const fromSource = await resolveCategoriesFromSource(
    parsed.transactions,
    categories ?? [],
    async (name, kind) => {
      const { data, error } = await supabase
        .from("categories")
        .insert({ user_id: userId, name, kind })
        .select("id")
        .single()
      if (error || !data) return null
      return data.id as string
    }
  )

  const fromRules = applyCategoryRules(
    parsed.transactions,
    rules ?? [],
    sourceType
  )

  const transactions = parsed.transactions.map((t) => ({
    ...t,
    // Prefer category from file; fall back to user description rules
    category_id:
      fromSource.get(t.externalHash) ?? fromRules.get(t.externalHash) ?? null,
  }))

  const { data: freshCategories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId)
    .order("name")

  await supabase
    .from("imports")
    .update({
      status: "parsed",
      file_path: uploadError ? null : path,
      raw_meta: { ...parsed.meta, warnings: metaWarnings },
    })
    .eq("id", importRow.id)

  return {
    preview: {
      importId: importRow.id,
      sourceType,
      accountId,
      meta: { ...parsed.meta, warnings: metaWarnings },
      transactions,
      positions: parsed.positions,
      movements: parsed.movements,
      categories: freshCategories ?? [],
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
  const auth = await requireUser()
  if (!auth.ok) return { error: auth.error }
  const { supabase, userId } = auth

  let inserted = 0
  let skipped = 0

  if (payload.transactions.length > 0) {
    const rows = payload.transactions.map((t) => ({
      user_id: userId,
      account_id: payload.accountId,
      import_id: payload.importId,
      date: t.date,
      description: t.description,
      amount: t.amount,
      category_id: t.category_id ?? null,
      merchant: t.merchant ?? null,
      installment: t.installment ?? null,
      external_hash: t.externalHash,
      source_category: t.sourceCategory ?? null,
      source_type: payload.sourceType,
      is_transfer: Boolean(t.isTransfer),
    }))

    const { data, error } = await supabase
      .from("transactions")
      .upsert(rows, {
        onConflict: "user_id,external_hash",
        ignoreDuplicates: true,
      })
      .select("id")

    if (error) {
      await supabase
        .from("imports")
        .update({ status: "failed", error: error.message })
        .eq("id", payload.importId)
      return { error: error.message }
    }
    inserted += data?.length ?? 0
    skipped += rows.length - (data?.length ?? 0)
  }

  if (payload.positions.length > 0) {
    const rows = payload.positions.map((p) => ({
      user_id: userId,
      account_id: payload.accountId,
      ticker: p.ticker ?? null,
      asset_name: p.assetName,
      asset_class: p.assetClass,
      quantity: p.quantity,
      avg_price: p.avgPrice,
      current_price: p.currentPrice,
      as_of: p.asOf,
      purchase_date: p.purchaseDate ?? null,
      rate: p.rate ?? null,
      rate_type: p.rateType ?? null,
      amount_original: p.amountOriginal ?? null,
      amount_withdrawal: p.amountWithdrawal ?? null,
      external_hash: p.externalHash,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from("investment_positions").upsert(rows, {
      onConflict: "user_id,external_hash",
    })
    if (error) return { error: error.message }
    inserted += rows.length
  }

  if (payload.movements.length > 0) {
    const rows = payload.movements.map((m) => ({
      user_id: userId,
      account_id: payload.accountId,
      import_id: payload.importId,
      date: m.date,
      type: m.type,
      description: m.description ?? null,
      amount: m.amount,
      external_hash: m.externalHash,
    }))

    const { error } = await supabase
      .from("investment_movements")
      .upsert(rows, {
        onConflict: "user_id,external_hash",
        ignoreDuplicates: true,
      })
    if (error) return { error: error.message }
  }

  await supabase
    .from("imports")
    .update({ status: "committed" })
    .eq("id", payload.importId)

  revalidatePath("/transacoes")
  revalidatePath("/painel")
  revalidatePath("/investimentos")
  revalidatePath("/importar")

  return { inserted, skipped }
}
