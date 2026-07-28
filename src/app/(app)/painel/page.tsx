import { Suspense } from "react"
import { createClient } from "@/lib/server"
import { PainelClient } from "@/components/painel-client"
import { PainelAccountFilter } from "@/components/painel-account-filter"
import { currentYearMonth, monthBounds } from "@/lib/format"
import { positionCurrentValue } from "@/lib/investments/value"
import type { Account } from "@/lib/types"

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const accountId = params.account_id || null
  const yearMonth = currentYearMonth()
  const { start, end } = monthBounds(yearMonth)
  const supabase = await createClient()

  let txnsQuery = supabase
    .from("transactions")
    .select("date, amount, category_id, account_id, is_transfer, source_type")
    .gte("date", start)
    .lte("date", end)

  let snapshotsQuery = supabase
    .from("balance_snapshots")
    .select("account_id, source_type, balance")

  let positionsQuery = supabase
    .from("investment_positions")
    .select("quantity, current_price, amount_withdrawal, account_id")

  let allTxnsQuery = supabase
    .from("transactions")
    .select("amount, source_type, account_id")

  if (accountId) {
    txnsQuery = txnsQuery.eq("account_id", accountId)
    snapshotsQuery = snapshotsQuery.eq("account_id", accountId)
    positionsQuery = positionsQuery.eq("account_id", accountId)
    allTxnsQuery = allTxnsQuery.eq("account_id", accountId)
  }

  const [
    { data: txns },
    { data: positions },
    { data: budgets },
    { data: goals },
    { data: categories },
    { data: snapshots },
    { data: accounts },
    { data: allTxns },
  ] = await Promise.all([
    txnsQuery,
    positionsQuery,
    supabase
      .from("budgets")
      .select("*, categories(name)")
      .eq("year_month", yearMonth),
    supabase.from("goals").select("*").eq("is_archived", false).limit(5),
    supabase.from("categories").select("id, name, color"),
    snapshotsQuery,
    supabase
      .from("accounts")
      .select("*")
      .eq("is_active", true)
      .order("name"),
    allTxnsQuery,
  ])

  let checkingFromTxns = 0
  let creditDebt = 0
  for (const t of allTxns ?? []) {
    const type = t.source_type
    const amt = Number(t.amount)
    if (type === "checking") checkingFromTxns += amt
    if (type === "credit_card") creditDebt += amt
  }
  const creditFromTxns = creditDebt < 0 ? Math.abs(creditDebt) : 0
  const investments = (positions ?? []).reduce(
    (s, p) => s + positionCurrentValue(p),
    0
  )

  let checkingSnap = 0
  let creditSnap = 0
  let investSnap: number | null = null
  let hasCheckingSnap = false
  let hasCreditSnap = false
  let hasInvestSnap = false

  for (const s of snapshots ?? []) {
    const bal = Number(s.balance)
    if (s.source_type === "checking") {
      checkingSnap += bal
      hasCheckingSnap = true
    } else if (s.source_type === "credit_card") {
      creditSnap += bal
      hasCreditSnap = true
    } else if (s.source_type === "investment") {
      investSnap = (investSnap ?? 0) + bal
      hasInvestSnap = true
    }
  }

  const checking = hasCheckingSnap ? checkingSnap : checkingFromTxns
  const creditLiability = hasCreditSnap ? creditSnap : creditFromTxns
  const investBalance = hasInvestSnap ? (investSnap as number) : investments
  const netWorth = checking - creditLiability + investBalance

  let income = 0
  let expense = 0
  const byDay = new Map<string, { entradas: number; saidas: number }>()
  const byCat = new Map<string, number>()

  for (const t of txns ?? []) {
    if (t.is_transfer) continue
    const amt = Number(t.amount)
    const day = t.date.slice(8, 10)
    const bucket = byDay.get(day) ?? { entradas: 0, saidas: 0 }
    if (amt > 0) {
      income += amt
      bucket.entradas += amt
    } else {
      expense += Math.abs(amt)
      bucket.saidas += Math.abs(amt)
      if (t.category_id) {
        byCat.set(t.category_id, (byCat.get(t.category_id) ?? 0) + Math.abs(amt))
      }
    }
    byDay.set(day, bucket)
  }

  const flowByDay = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, ...v }))

  const catName = new Map((categories ?? []).map((c) => [c.id, c]))
  const topCategories = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, value]) => ({
      name: catName.get(id)?.name ?? "Outros",
      value,
      color: catName.get(id)?.color,
    }))

  const spentByCat = new Map<string, number>()
  for (const t of txns ?? []) {
    if (t.is_transfer || !t.category_id) continue
    const amt = Number(t.amount)
    if (amt >= 0) continue
    spentByCat.set(
      t.category_id,
      (spentByCat.get(t.category_id) ?? 0) + Math.abs(amt)
    )
  }

  const budgetRows = (budgets ?? []).map((b) => ({
    name:
      (b.categories as unknown as { name: string } | null)?.name ?? "Categoria",
    spent: spentByCat.get(b.category_id) ?? 0,
    limit: Number(b.limit_amount),
  }))

  const goalRows = (goals ?? []).map((g) => ({
    name: g.name,
    current: Number(g.current_amount),
    target: Number(g.target_amount),
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral de {yearMonth}
          </p>
        </div>
        <Suspense>
          <PainelAccountFilter accounts={(accounts ?? []) as Account[]} />
        </Suspense>
      </div>
      <PainelClient
        netWorth={netWorth}
        checking={checking}
        creditDebt={creditLiability}
        investments={investBalance}
        income={income}
        expense={expense}
        flowByDay={flowByDay}
        topCategories={topCategories}
        budgets={budgetRows}
        goals={goalRows}
      />
    </div>
  )
}
