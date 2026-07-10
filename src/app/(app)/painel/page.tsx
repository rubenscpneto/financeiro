import { createClient } from "@/lib/server"
import { PainelClient } from "@/components/painel-client"
import { currentYearMonth, monthBounds } from "@/lib/format"

export default async function PainelPage() {
  const yearMonth = currentYearMonth()
  const { start, end } = monthBounds(yearMonth)
  const supabase = await createClient()

  const [
    { data: accounts },
    { data: txns },
    { data: positions },
    { data: budgets },
    { data: goals },
    { data: categories },
  ] = await Promise.all([
    supabase.from("accounts").select("id, type"),
    supabase
      .from("transactions")
      .select("date, amount, category_id, account_id, is_transfer")
      .gte("date", start)
      .lte("date", end),
    supabase.from("investment_positions").select("quantity, current_price"),
    supabase
      .from("budgets")
      .select("*, categories(name)")
      .eq("year_month", yearMonth),
    supabase
      .from("goals")
      .select("*")
      .eq("is_archived", false)
      .limit(5),
    supabase.from("categories").select("id, name, color"),
  ])

  // Approximate balances from all-time transactions per account type
  const { data: allTxns } = await supabase
    .from("transactions")
    .select("amount, account_id, accounts!inner(type)")

  let checking = 0
  let creditDebt = 0
  for (const t of allTxns ?? []) {
    const type = (t.accounts as unknown as { type: string })?.type
    const amt = Number(t.amount)
    if (type === "checking") checking += amt
    if (type === "credit_card") {
      // purchases negative → debt is -sum of negatives = abs of negative sum
      creditDebt += amt
    }
  }
  // creditDebt: sum of amounts; purchases are negative so sum is negative; debt = -sum if sum < 0
  const creditLiability = creditDebt < 0 ? Math.abs(creditDebt) : 0
  // If payments exceed purchases, liability 0
  const investments = (positions ?? []).reduce(
    (s, p) => s + Number(p.quantity) * Number(p.current_price),
    0
  )
  const netWorth = checking - creditLiability + investments

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
    spentByCat.set(t.category_id, (spentByCat.get(t.category_id) ?? 0) + Math.abs(amt))
  }

  const budgetRows = (budgets ?? []).map((b) => ({
    name: (b.categories as unknown as { name: string } | null)?.name ?? "Categoria",
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral de {yearMonth}
        </p>
      </div>
      <PainelClient
        netWorth={netWorth}
        checking={checking}
        creditDebt={creditLiability}
        investments={investments}
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
