import { revalidatePath } from "next/cache"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  applyCategoryRules,
  resolveCategoriesFromSource,
  type AccountSourceType,
  type ParsedTransaction,
} from "@/lib/parsers"
import { makeHash } from "@/lib/parsers/normalize"
import type { AccountType } from "@/lib/types"
import {
  assertItemReady,
  fetchAccounts,
  fetchAllTransactions,
  fetchInvestmentTransactions,
  fetchInvestments,
  fetchItem,
  getApiKey,
  getItemId,
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
  supabase: SupabaseClient,
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
  const { data: existing } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("pluggy_account_id", input.pluggyAccountId)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from("accounts")
      .update({
        name: input.name,
        type: input.type,
        institution: input.institution,
        last4: input.last4,
        currency: input.currency,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
    if (error) throw new Error(error.message)
    return existing.id as string
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      pluggy_account_id: input.pluggyAccountId,
      name: input.name,
      type: input.type,
      institution: input.institution,
      last4: input.last4,
      currency: input.currency,
      is_active: true,
    })
    .select("id")
    .single()

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Falha ao criar conta local")
  }
  return data.id as string
}

/**
 * Pull Meu Pluggy Item data into Supabase.
 * Creates/updates one local account per Pluggy account.
 */
export async function runPluggySync(
  supabase: SupabaseClient,
  userId: string
): Promise<SyncPluggyResult> {
  let itemId: string
  try {
    itemId = getItemId()
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
  const now = new Date().toISOString()
  const seenPluggyIds = new Set<string>()
  const localByPluggyId = new Map<string, string>()

  let accountsUpserted = 0
  let balances = 0

  for (const acc of pluggyAccounts) {
    const sourceType = mapAccountSourceType(acc)
    if (!sourceType) continue

    try {
      const localId = await upsertLocalAccount(supabase, userId, {
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
      const { error } = await supabase.from("balance_snapshots").upsert(
        {
          user_id: userId,
          account_id: localId,
          source_type: sourceType,
          balance,
          pluggy_account_id: acc.id,
          updated_at: now,
        },
        { onConflict: "user_id,account_id" }
      )
      if (error) return { error: error.message }
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
    investAccountId = await upsertLocalAccount(supabase, userId, {
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

  // Soft-deactivate Pluggy-linked accounts missing from this sync
  const { data: linkedAccounts } = await supabase
    .from("accounts")
    .select("id, pluggy_account_id")
    .eq("user_id", userId)
    .not("pluggy_account_id", "is", null)

  for (const row of linkedAccounts ?? []) {
    const pid = row.pluggy_account_id as string
    if (!seenPluggyIds.has(pid)) {
      await supabase
        .from("accounts")
        .update({ is_active: false, updated_at: now })
        .eq("id", row.id)
    }
  }

  const [{ data: rules }, { data: categoryRows }] = await Promise.all([
    supabase
      .from("category_rules")
      .select("match_pattern, category_id, priority, account_type")
      .eq("user_id", userId)
      .order("priority", { ascending: true }),
    supabase.from("categories").select("id, name, kind").eq("user_id", userId),
  ])

  const categories = [...(categoryRows ?? [])]
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
      categories,
      async (name, kind) => {
        const { data, error } = await supabase
          .from("categories")
          .insert({ user_id: userId, name, kind })
          .select("id")
          .single()
        if (error || !data) return null
        categories.push({
          id: data.id as string,
          name,
          kind,
        })
        return data.id as string
      }
    )

    const fromRules = applyCategoryRules(
      parsed,
      rules ?? [],
      sourceType as AccountSourceType
    )

    const rows = parsed.map((t) => ({
      user_id: userId,
      account_id: accountId,
      import_id: null,
      date: t.date,
      description: t.description,
      amount: t.amount,
      category_id:
        fromSource.get(t.externalHash) ??
        fromRules.get(t.externalHash) ??
        null,
      merchant: t.merchant ?? null,
      installment: t.installment ?? null,
      external_hash: t.externalHash,
      source_category: t.sourceCategory ?? null,
      source_type: sourceType,
      is_transfer: Boolean(t.isTransfer),
      updated_at: now,
    }))

    const { data, error } = await supabase
      .from("transactions")
      .upsert(rows, {
        onConflict: "user_id,external_hash",
        ignoreDuplicates: false,
      })
      .select("id")

    if (error) return { error: error.message }
    inserted += data?.length ?? 0
    skipped += Math.max(0, rows.length - (data?.length ?? 0))
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

  const positionRows = investments
    .map(mapInvestment)
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => ({
      user_id: userId,
      account_id: investAccountId,
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
      is_active: true,
      updated_at: now,
    }))

  if (positionRows.length > 0) {
    const { error } = await supabase.from("investment_positions").upsert(
      positionRows,
      { onConflict: "user_id,external_hash" }
    )
    if (error) return { error: error.message }
    positions = positionRows.length
  }

  // Soft-deactivate Pluggy positions missing from this sync (sold / TOTAL_WITHDRAWAL).
  // Scope: current invest account + any other investment-type accounts for this user
  // (avoids killing CSV positions on checking/credit accounts).
  const syncedHashes = new Set(positionRows.map((p) => p.external_hash))
  const { data: investAccounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "investment")

  const investAccountIds = [
    ...new Set([
      investAccountId,
      ...(investAccounts ?? []).map((a) => a.id as string),
    ]),
  ]

  const { data: existingPositions } = await supabase
    .from("investment_positions")
    .select("id, external_hash")
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("account_id", investAccountIds)

  const staleIds = (existingPositions ?? [])
    .filter((p) => !syncedHashes.has(p.external_hash as string))
    .map((p) => p.id as string)

  if (staleIds.length > 0) {
    const { error } = await supabase
      .from("investment_positions")
      .update({ is_active: false, updated_at: now })
      .in("id", staleIds)
    if (error) return { error: error.message }
  }

  const positionIdByHash = new Map<string, string>()
  if (positionRows.length > 0) {
    const { data: positionIds } = await supabase
      .from("investment_positions")
      .select("id, external_hash")
      .eq("user_id", userId)
      .in(
        "external_hash",
        positionRows.map((p) => p.external_hash)
      )

    for (const p of positionIds ?? []) {
      positionIdByHash.set(p.external_hash as string, p.id as string)
    }
  }

  for (const inv of investments) {
    let invTxns
    try {
      invTxns = await fetchInvestmentTransactions(apiKey, inv.id)
    } catch {
      continue
    }
    const positionHash = makeHash("pluggy-inv", inv.id)
    const positionId = positionIdByHash.get(positionHash) ?? null
    const movementRows = invTxns.map(mapInvestmentTransaction).map((m) => ({
      user_id: userId,
      account_id: investAccountId,
      position_id: positionId,
      import_id: null,
      date: m.date,
      type: m.type,
      description: m.description ?? null,
      amount: m.amount,
      external_hash: m.externalHash,
    }))
    if (movementRows.length === 0) continue
    const { error } = await supabase
      .from("investment_movements")
      .upsert(movementRows, {
        onConflict: "user_id,external_hash",
        ignoreDuplicates: false,
      })
    if (error) return { error: error.message }
    movements += movementRows.length
  }

  const investTotal = positionRows.reduce((s, p) => {
    if (p.amount_withdrawal != null && Number.isFinite(Number(p.amount_withdrawal))) {
      return s + Number(p.amount_withdrawal)
    }
    return s + Number(p.quantity) * Number(p.current_price)
  }, 0)
  {
    const { error } = await supabase.from("balance_snapshots").upsert(
      {
        user_id: userId,
        account_id: investAccountId,
        source_type: "investment",
        balance: investTotal,
        pluggy_account_id: investPluggyId,
        updated_at: now,
      },
      { onConflict: "user_id,account_id" }
    )
    if (error) return { error: error.message }
    balances += 1
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
