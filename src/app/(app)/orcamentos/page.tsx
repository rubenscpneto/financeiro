import { createClient } from "@/lib/server"
import { OrcamentosClient } from "@/components/orcamentos-client"
import { currentYearMonth, monthBounds } from "@/lib/format"
import type { Budget, Category } from "@/lib/types"

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const params = await searchParams
  const yearMonth = params.mes || currentYearMonth()
  const { start, end } = monthBounds(yearMonth)
  const supabase = await createClient()

  const [{ data: budgets }, { data: categories }, { data: txns }] =
    await Promise.all([
      supabase
        .from("budgets")
        .select("*, categories(name, color)")
        .eq("year_month", yearMonth),
      supabase.from("categories").select("*").order("name"),
      supabase
        .from("transactions")
        .select("category_id, amount, is_transfer")
        .gte("date", start)
        .lte("date", end)
        .eq("is_transfer", false),
    ])

  const spentByCat = new Map<string, number>()
  for (const t of txns ?? []) {
    if (!t.category_id) continue
    const amt = Number(t.amount)
    if (amt >= 0) continue
    spentByCat.set(t.category_id, (spentByCat.get(t.category_id) ?? 0) + amt)
  }

  const rows = (budgets ?? []).map((b) => ({
    ...b,
    spent: spentByCat.get(b.category_id) ?? 0,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
        <p className="text-sm text-muted-foreground">
          Limites mensais e acompanhamento de gastos.
        </p>
      </div>
      <OrcamentosClient
        budgets={rows as (Budget & {
          categories?: { name: string; color: string | null } | null
          spent: number
        })[]}
        categories={(categories ?? []) as Category[]}
        yearMonth={yearMonth}
      />
    </div>
  )
}
