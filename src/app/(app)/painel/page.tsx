import { Suspense } from "react"
import { and, eq, gte, lte } from "drizzle-orm"
import { db } from "@/db"
import {
  accounts,
  balanceSnapshots,
  budgets,
  categories,
  goals,
  investmentPositions,
  transactions,
} from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
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
  const { userId } = await requireUserOrRedirect()
  const params = await searchParams
  const accountId = params.account_id || null
  const yearMonth = currentYearMonth()
  const { start, end } = monthBounds(yearMonth)

  const txnFilters = [
    eq(transactions.user_id, userId),
    gte(transactions.date, start),
    lte(transactions.date, end),
  ]
  const snapshotFilters = [eq(balanceSnapshots.user_id, userId)]
  const positionFilters = [
    eq(investmentPositions.user_id, userId),
    eq(investmentPositions.is_active, true),
    eq(accounts.type, "investment"),
  ]
  const allTxnFilters = [eq(transactions.user_id, userId)]

  if (accountId) {
    txnFilters.push(eq(transactions.account_id, accountId))
    snapshotFilters.push(eq(balanceSnapshots.account_id, accountId))
    positionFilters.push(eq(investmentPositions.account_id, accountId))
    allTxnFilters.push(eq(transactions.account_id, accountId))
  }

  const [
    txns,
    positions,
    budgetRowsRaw,
    goalRowsRaw,
    categoryRows,
    snapshots,
    accountRows,
    allTxns,
  ] = await Promise.all([
    db
      .select({
        date: transactions.date,
        amount: transactions.amount,
        category_id: transactions.category_id,
        account_id: transactions.account_id,
        is_transfer: transactions.is_transfer,
        source_type: transactions.source_type,
      })
      .from(transactions)
      .where(and(...txnFilters)),
    db
      .select({
        quantity: investmentPositions.quantity,
        current_price: investmentPositions.current_price,
        amount_withdrawal: investmentPositions.amount_withdrawal,
        account_id: investmentPositions.account_id,
      })
      .from(investmentPositions)
      .innerJoin(accounts, eq(investmentPositions.account_id, accounts.id))
      .where(and(...positionFilters)),
    db
      .select({
        category_id: budgets.category_id,
        limit_amount: budgets.limit_amount,
        category_name: categories.name,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.category_id, categories.id))
      .where(and(eq(budgets.user_id, userId), eq(budgets.year_month, yearMonth))),
    db
      .select()
      .from(goals)
      .where(and(eq(goals.user_id, userId), eq(goals.is_archived, false)))
      .limit(5),
    db
      .select({
        id: categories.id,
        name: categories.name,
        color: categories.color,
      })
      .from(categories)
      .where(eq(categories.user_id, userId)),
    db
      .select({
        account_id: balanceSnapshots.account_id,
        source_type: balanceSnapshots.source_type,
        balance: balanceSnapshots.balance,
      })
      .from(balanceSnapshots)
      .where(and(...snapshotFilters)),
    db
      .select()
      .from(accounts)
      .where(and(eq(accounts.user_id, userId), eq(accounts.is_active, true)))
      .orderBy(accounts.name),
    db
      .select({
        amount: transactions.amount,
        source_type: transactions.source_type,
        account_id: transactions.account_id,
      })
      .from(transactions)
      .where(and(...allTxnFilters)),
  ])

  let checkingFromTxns = 0
  let creditDebt = 0
  for (const t of allTxns) {
    const type = t.source_type
    const amt = Number(t.amount)
    if (type === "checking") checkingFromTxns += amt
    if (type === "credit_card") creditDebt += amt
  }
  const creditFromTxns = creditDebt < 0 ? Math.abs(creditDebt) : 0
  const investments = positions.reduce((s, p) => s + positionCurrentValue(p), 0)

  let checkingSnap = 0
  let creditSnap = 0
  let investSnap: number | null = null
  let hasCheckingSnap = false
  let hasCreditSnap = false
  let hasInvestSnap = false

  for (const s of snapshots) {
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

  for (const t of txns) {
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

  const catName = new Map(categoryRows.map((c) => [c.id, c]))
  const topCategories = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, value]) => ({
      name: catName.get(id)?.name ?? "Outros",
      value,
      color: catName.get(id)?.color,
    }))

  const spentByCat = new Map<string, number>()
  for (const t of txns) {
    if (t.is_transfer || !t.category_id) continue
    const amt = Number(t.amount)
    if (amt >= 0) continue
    spentByCat.set(
      t.category_id,
      (spentByCat.get(t.category_id) ?? 0) + Math.abs(amt)
    )
  }

  const budgetRows = budgetRowsRaw.map((b) => ({
    name: b.category_name ?? "Categoria",
    spent: spentByCat.get(b.category_id) ?? 0,
    limit: Number(b.limit_amount),
  }))

  const goalRows = goalRowsRaw.map((g) => ({
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
          <PainelAccountFilter accounts={accountRows as Account[]} />
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
