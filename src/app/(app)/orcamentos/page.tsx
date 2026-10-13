import { and, eq, gte, lte } from "drizzle-orm"
import { db } from "@/db"
import { budgets, categories, transactions } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { OrcamentosClient } from "@/components/orcamentos-client"
import { currentYearMonth, monthBounds } from "@/lib/format"
import { classifyTransaction } from "@/lib/txn-class"
import { categoryLabelPt } from "@/lib/pluggy-categories-pt"
import type { Budget, Category } from "@/lib/types"

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { userId } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)
  const params = await searchParams
  const yearMonth = params.mes || currentYearMonth()
  const { start, end } = monthBounds(yearMonth)

  const [budgetRows, categoryRows, txns] = await Promise.all([
    db
      .select({
        budget: budgets,
        category_name: categories.name,
        category_color: categories.color,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.category_id, categories.id))
      .where(and(eq(budgets.user_id, userId), eq(budgets.year_month, yearMonth)))
      .orderBy(budgets.category_id, budgets.id),
    db
      .select()
      .from(categories)
      .where(eq(categories.user_id, userId))
      .orderBy(categories.name, categories.id),
    db
      .select({
        category_id: transactions.category_id,
        amount: transactions.amount,
        is_transfer: transactions.is_transfer,
        source_type: transactions.source_type,
        source_category: transactions.source_category,
        description: transactions.description,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, userId),
          gte(transactions.date, start),
          lte(transactions.date, end)
        )
      ),
  ])

  const catById = new Map(categoryRows.map((c) => [c.id, c.name]))
  const spentByCat = new Map<string, number>()
  for (const t of txns) {
    if (!t.category_id) continue
    const amt = crypto.decryptNum("amount", t.amount)
    const cls = classifyTransaction({
      amount: amt,
      description: crypto.decryptFlex("description", t.description),
      source_type: t.source_type,
      source_category: crypto.decryptFlex("source_category", t.source_category),
      category_name: catById.get(t.category_id),
      is_transfer: t.is_transfer,
    })
    if (!cls.isExpense) continue
    spentByCat.set(
      t.category_id,
      (spentByCat.get(t.category_id) ?? 0) + Math.abs(amt)
    )
  }

  const rows = budgetRows.map((b) => ({
    ...b.budget,
    limit_amount: crypto.decryptNum("limit_amount", b.budget.limit_amount),
    categories: b.category_name
      ? { name: categoryLabelPt(b.category_name), color: b.category_color }
      : null,
    spent: spentByCat.get(b.budget.category_id) ?? 0,
  }))

  return (
    <OrcamentosClient
        budgets={rows as (Budget & {
          categories?: { name: string; color: string | null } | null
          spent: number
        })[]}
        categories={
          (categoryRows as Category[]).map((c) => ({
            ...c,
            name: categoryLabelPt(c.name),
          }))
        }
        yearMonth={yearMonth}
      />
  )
}
