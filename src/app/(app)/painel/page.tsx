import { and, desc, eq, gte, inArray, lte } from "drizzle-orm"
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
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { decAccount } from "@/lib/crypto/rows"
import { PainelClient } from "@/components/painel-client"
import { currentYearMonth, monthBounds } from "@/lib/format"
import { positionCurrentValue } from "@/lib/investments/value"
import {
  accountBankById,
  accountIdsForBank,
  applyOwnBankTransfers,
  balanceIdsForBank,
  bankFromParams,
  bankHeadlineSuffix,
  dedupeTransactions,
  filterByAccountIds,
  groupAccountsByBank,
  primaryAccountIds,
} from "@/lib/banks"
import { decorateTransactions } from "@/lib/txn-class"
import { categoryLabelPt } from "@/lib/pluggy-categories-pt"
import type { Account } from "@/lib/types"

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000"

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { userId } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)
  const params = await searchParams
  const bank = bankFromParams(params.bank)
  const yearMonth = currentYearMonth()
  const { start, end } = monthBounds(yearMonth)

  const accountRows = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.user_id, userId), eq(accounts.is_active, true)))

  const decodedAccounts = accountRows
    .map((a) => decAccount(crypto, a))
    .sort(
      (a, b) => a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id)
    ) as Account[]

  const banks = groupAccountsByBank(decodedAccounts)
  const txnIds = accountIdsForBank(banks, bank)
  const balIds =
    balanceIdsForBank(banks, bank) ??
    banks.flatMap((g) => g.balanceAccountIds)
  const snapScope = balIds.length > 0 ? balIds : [EMPTY_UUID]
  const bankSuffix = bankHeadlineSuffix(banks, bank)
  const bankName = bank
    ? banks.find((b) => b.key === bank)?.name ?? null
    : null

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

  snapshotFilters.push(inArray(balanceSnapshots.account_id, snapScope))
  positionFilters.push(inArray(investmentPositions.account_id, snapScope))
  allTxnFilters.push(inArray(transactions.account_id, snapScope))

  const [
    txns,
    positions,
    budgetRowsRaw,
    goalRowsRaw,
    categoryRows,
    snapshots,
    allTxns,
  ] = await Promise.all([
    db
      .select({
        id: transactions.id,
        date: transactions.date,
        amount: transactions.amount,
        category_id: transactions.category_id,
        account_id: transactions.account_id,
        is_transfer: transactions.is_transfer,
        source_type: transactions.source_type,
        source_category: transactions.source_category,
        description: transactions.description,
        merchant: transactions.merchant,
        installment: transactions.installment,
        notes: transactions.notes,
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
      .where(and(eq(budgets.user_id, userId), eq(budgets.year_month, yearMonth)))
      .orderBy(budgets.category_id, budgets.id),
    db
      .select()
      .from(goals)
      .where(and(eq(goals.user_id, userId), eq(goals.is_archived, false)))
      .orderBy(desc(goals.created_at), desc(goals.id))
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
    const amt = crypto.decryptNum("amount", t.amount)
    if (type === "checking") checkingFromTxns += amt
    if (type === "credit_card") creditDebt += amt
  }
  const creditFromTxns = creditDebt < 0 ? Math.abs(creditDebt) : 0
  const investments = positions.reduce(
    (s, p) =>
      s +
      positionCurrentValue({
        quantity: crypto.decryptNum("quantity", p.quantity),
        current_price: crypto.decryptNum("current_price", p.current_price),
        amount_withdrawal: crypto.decryptNumOpt(
          "amount_withdrawal",
          p.amount_withdrawal
        ),
      }),
    0
  )

  let checkingSnap = 0
  let creditSnap = 0
  let investSnap: number | null = null
  let hasCheckingSnap = false
  let hasCreditSnap = false
  let hasInvestSnap = false

  for (const s of snapshots) {
    const bal = crypto.decryptNum("balance", s.balance)
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

  const catName = new Map(categoryRows.map((c) => [c.id, c]))
  const decorated = applyOwnBankTransfers(
    decorateTransactions(
      dedupeTransactions(
        txns.map((t) => ({
          id: t.id,
          date: t.date,
          amount: crypto.decryptNum("amount", t.amount),
          category_id: t.category_id,
          account_id: t.account_id,
          is_transfer: t.is_transfer,
          source_type: t.source_type,
          source_category: crypto.decryptFlex("source_category", t.source_category),
          description: crypto.decryptFlex("description", t.description),
          merchant: crypto.decryptFlex("merchant", t.merchant),
          installment: crypto.decryptFlex("installment", t.installment),
          notes: crypto.decryptFlex("notes", t.notes),
          category_name: t.category_id ? catName.get(t.category_id)?.name : null,
        })),
        { primaryAccountIds: primaryAccountIds(banks) }
      ),
      { yearMonth }
    ),
    {
      filteredBankKey: bank,
      accountBankById: accountBankById(banks),
    }
  )
  const scopedDecorated = filterByAccountIds(decorated, txnIds)

  let income = 0
  let expense = 0
  const byDay = new Map<string, { entradas: number; saidas: number }>()
  const byCat = new Map<string, number>()

  for (const t of scopedDecorated) {
    const cls = t.class
    if (cls.hide) continue
    const day = (t.date ?? "").slice(8, 10)
    const bucket = byDay.get(day) ?? { entradas: 0, saidas: 0 }
    if (cls.incomeDelta) {
      income += cls.incomeDelta
      bucket.entradas += cls.incomeDelta
    }
    if (cls.expenseDelta) {
      expense += cls.expenseDelta
      if (cls.expenseDelta > 0) bucket.saidas += cls.expenseDelta
    }
    if (cls.countInCategory && t.category_id && cls.expenseDelta) {
      byCat.set(
        t.category_id,
        (byCat.get(t.category_id) ?? 0) + cls.expenseDelta
      )
    }
    byDay.set(day, bucket)
  }

  const flowByDay = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, ...v }))

  const topCategories = [...byCat.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([id, value]) => ({
      name: categoryLabelPt(catName.get(id)?.name ?? "Outros"),
      value,
      color: catName.get(id)?.color,
    }))

  const spentByCat = new Map<string, number>()
  for (const t of decorated) {
    if (!t.category_id || t.class.hide || !t.class.countInCategory) continue
    if (!t.class.expenseDelta) continue
    spentByCat.set(
      t.category_id,
      (spentByCat.get(t.category_id) ?? 0) + t.class.expenseDelta
    )
  }

  const budgetRows = budgetRowsRaw.map((b) => ({
    name: categoryLabelPt(b.category_name ?? "Categoria"),
    spent: spentByCat.get(b.category_id) ?? 0,
    limit: crypto.decryptNum("limit_amount", b.limit_amount),
  }))

  const goalRows = goalRowsRaw.map((g) => ({
    name: crypto.decryptFlex("name", g.name) ?? g.name,
    current: crypto.decryptNum("current_amount", g.current_amount),
    target: crypto.decryptNum("target_amount", g.target_amount),
  }))

  return (
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
      bankName={bankName}
      bankSuffix={bankSuffix}
    />
  )
}
