import { and, eq, gte, lte } from "drizzle-orm"
import { db } from "@/db"
import { accounts, budgets, categories, transactions } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { OrcamentosClient } from "@/components/orcamentos-client"
import { currentYearMonth, monthBounds } from "@/lib/format"
import { decorateTransactions, spendCategoryId } from "@/lib/txn-class"
import { categoryLabelPt } from "@/lib/pluggy-categories-pt"
import type { Budget, Category } from "@/lib/types"
import { decAccount } from "@/lib/crypto/rows"
import {
  dedupeTransactions,
  groupAccountsByBank,
  primaryAccountIds,
} from "@/lib/banks"

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

  const [budgetRows, categoryRows, txns, accountRows] = await Promise.all([
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
        id: transactions.id,
        category_id: transactions.category_id,
        user_category_id: transactions.user_category_id,
        account_id: transactions.account_id,
        date: transactions.date,
        amount: transactions.amount,
        is_transfer: transactions.is_transfer,
        source_type: transactions.source_type,
        source_category: transactions.source_category,
        description: transactions.description,
        merchant: transactions.merchant,
        installment: transactions.installment,
        notes: transactions.notes,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, userId),
          gte(transactions.date, start),
          lte(transactions.date, end)
        )
      ),
    db
      .select()
      .from(accounts)
      .where(eq(accounts.user_id, userId)),
  ])

  const catById = new Map(categoryRows.map((c) => [c.id, c.name]))
  const banks = groupAccountsByBank(accountRows.map((a) => decAccount(crypto, a)))
  const decorated = decorateTransactions(
    dedupeTransactions(
    txns.map((t) => ({
      id: t.id,
      category_id: t.category_id,
      user_category_id: t.user_category_id,
      account_id: t.account_id,
      date: t.date,
      amount: crypto.decryptNum("amount", t.amount),
      is_transfer: t.is_transfer,
      source_type: t.source_type,
      source_category: crypto.decryptFlex("source_category", t.source_category),
      description: crypto.decryptFlex("description", t.description),
      merchant: crypto.decryptFlex("merchant", t.merchant),
      installment: crypto.decryptFlex("installment", t.installment),
      notes: crypto.decryptFlex("notes", t.notes),
      category_name: t.category_id ? catById.get(t.category_id) : null,
      user_category_name: t.user_category_id
        ? catById.get(t.user_category_id) ?? null
        : null,
    })),
      { primaryAccountIds: primaryAccountIds(banks) }
    ),
    { yearMonth }
  )
  const spentByCat = new Map<string, number>()
  for (const t of decorated) {
    if (t.class.hide || !t.class.countInCategory) continue
    if (!t.class.expenseDelta) continue
    const catId = spendCategoryId(t)
    if (!catId) continue
    spentByCat.set(catId, (spentByCat.get(catId) ?? 0) + t.class.expenseDelta)
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
