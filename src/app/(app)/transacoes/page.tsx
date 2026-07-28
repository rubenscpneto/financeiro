import { Suspense } from "react"
import { createClient } from "@/lib/server"
import { TransacoesClient } from "@/components/transacoes-client"
import {
  currentYearMonth,
  monthBounds,
} from "@/lib/format"
import type { Account, Category, Transaction } from "@/lib/types"

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const hasCustomRange = Boolean(params.from || params.to)
  const yearMonth = !hasCustomRange
    ? params.mes || currentYearMonth()
    : null

  let from = params.from
  let to = params.to
  if (yearMonth) {
    const bounds = monthBounds(yearMonth)
    from = bounds.start
    to = bounds.end
  }

  let query = supabase
    .from("transactions")
    .select("*, accounts(name), categories(name)")
    .order("date", { ascending: false })
    .limit(1000)

  if (params.account_id) query = query.eq("account_id", params.account_id)
  if (params.category_id) query = query.eq("category_id", params.category_id)
  if (from) query = query.gte("date", from)
  if (to) query = query.lte("date", to)

  const [{ data: transactions }, { data: accounts }, { data: categories }] =
    await Promise.all([
      query,
      supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .order("name"),
      supabase.from("categories").select("*").order("name"),
    ])

  const periodLabel = yearMonth
    ? yearMonth
    : from && to
      ? `${from} → ${to}`
      : "intervalo personalizado"

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
        <p className="text-sm text-muted-foreground">
          Operações de {periodLabel}. Filtre por conta, mês ou intervalo.
        </p>
      </div>
      <Suspense>
        <TransacoesClient
          transactions={(transactions ?? []) as (Transaction & {
            accounts?: { name: string } | null
            categories?: { name: string } | null
          })[]}
          accounts={(accounts ?? []) as Account[]}
          categories={(categories ?? []) as Category[]}
          yearMonth={yearMonth}
          from={from ?? ""}
          to={to ?? ""}
        />
      </Suspense>
    </div>
  )
}
