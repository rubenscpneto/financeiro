import { Suspense } from "react"
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm"
import { db } from "@/db"
import { accounts, adjustments, categories, transactions } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { decAccount, decAdjustment, decTransaction } from "@/lib/crypto/rows"
import { TransacoesClient } from "@/components/transacoes-client"
import { currentYearMonth, monthBounds, todayYmd } from "@/lib/format"
import {
  accountBankById,
  accountIdsForBank,
  applyOwnBankTransfers,
  bankFromParams,
  dedupeTransactions,
  filterByAccountIds,
  groupAccountsByBank,
  primaryAccountIds,
} from "@/lib/banks"
import { decorateTransactions } from "@/lib/txn-class"
import { categoryLabelPt } from "@/lib/pluggy-categories-pt"
import { groupLoans, type AdjustmentRow } from "@/lib/loans"
import type { Category, Transaction } from "@/lib/types"

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { userId } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)
  const params = await searchParams
  const bank = bankFromParams(params.bank)

  const hasCustomRange = Boolean(params.from || params.to)
  const yearMonth = !hasCustomRange ? params.mes || currentYearMonth() : null
  const today = todayYmd()

  let from = params.from
  let to = params.to
  if (yearMonth) {
    const bounds = monthBounds(yearMonth)
    from = bounds.start
    to = yearMonth === currentYearMonth() ? today : bounds.end
  }

  const [accountRows, categoryRows, adjRows] = await Promise.all([
    db
      .select()
      .from(accounts)
      .where(and(eq(accounts.user_id, userId), eq(accounts.is_active, true))),
    db
      .select()
      .from(categories)
      .where(eq(categories.user_id, userId))
      .orderBy(categories.name, categories.id),
    db
      .select()
      .from(adjustments)
      .where(eq(adjustments.user_id, userId)),
  ])

  const decodedAccounts = accountRows
    .map((a) => decAccount(crypto, a))
    .sort(
      (a, b) => a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id)
    )
  const banks = groupAccountsByBank(decodedAccounts)
  const bankIds = accountIdsForBank(banks, bank)

  const filters = [eq(transactions.user_id, userId)]
  if (params.category_id) {
    filters.push(
      or(
        eq(transactions.user_category_id, params.category_id),
        and(
          isNull(transactions.user_category_id),
          eq(transactions.category_id, params.category_id)
        )
      )!
    )
  }
  if (from) filters.push(gte(transactions.date, from))
  if (to) filters.push(lte(transactions.date, to))

  const [txnRows, loanRows] = await Promise.all([
    db
      .select({
        txn: transactions,
        account_name: accounts.name,
        category_name: categories.name,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.account_id, accounts.id))
      .leftJoin(categories, eq(transactions.category_id, categories.id))
      .where(and(...filters))
      .orderBy(desc(transactions.date), desc(transactions.id))
      .limit(1000),
    db
      .select({
        txn: transactions,
        account_name: accounts.name,
        category_name: categories.name,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.account_id, accounts.id))
      .leftJoin(categories, eq(transactions.category_id, categories.id))
      .where(eq(transactions.user_id, userId))
      .orderBy(desc(transactions.date))
      .limit(4000),
  ])

  const decodedAdj: AdjustmentRow[] = adjRows.map((a) => decAdjustment(crypto, a))
  const catById = new Map(categoryRows.map((c) => [c.id, c.name]))

  function mapRow(row: (typeof txnRows)[number]) {
    const txn = decTransaction(crypto, row.txn)
    const accountName = row.account_name
      ? crypto.decryptFlex("name", row.account_name)
      : null
    return {
      ...txn,
      accounts: accountName ? { name: accountName } : null,
      category_name: row.category_name,
      user_category_name: txn.user_category_id
        ? catById.get(txn.user_category_id) ?? null
        : null,
    }
  }

  const decorated = applyOwnBankTransfers(
    decorateTransactions(
      dedupeTransactions(txnRows.map(mapRow), {
        primaryAccountIds: primaryAccountIds(banks),
      }),
      { yearMonth, from, to }
    ),
    {
      filteredBankKey: bank,
      accountBankById: accountBankById(banks),
    }
  )

  const scoped = filterByAccountIds(decorated, bankIds)
  const hiddenDuplicates = scoped.filter((t) => t.class.kind === "card_bill_hidden")
  const visible = scoped.filter((t) => !t.class.hide)

  const helpAdj = decodedAdj.filter(
    (a) =>
      a.kind === "family_help" &&
      !a.undone_at &&
      (!from || a.date >= from) &&
      (!to || a.date <= to)
  )
  const helpSpend = helpAdj.reduce((s, a) => s + Math.abs(a.amount), 0)

  const entrou = visible.reduce((s, t) => s + t.class.incomeDelta, 0)
  const saiu =
    visible.reduce((s, t) => s + t.class.expenseDelta, 0) + helpSpend
  const cardBill = scoped
    .filter((t) => t.class.kind === "card_bill")
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0)
  const between = scoped
    .filter(
      (t) =>
        t.class.kind === "transfer" || t.class.kind === "investment_transfer"
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const loanOut = scoped
    .filter((t) => t.class.kind === "loan" && Number(t.amount) < 0)
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0)
  const loanIn = scoped
    .filter((t) => t.class.kind === "loan" && Number(t.amount) > 0)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0)

  const mapped = visible.map((t) => {
    const writeOff = decodedAdj.find(
      (a) => a.kind === "family_help" && !a.undone_at && a.ref_id === t.id
    )
    return {
      ...t,
      categories: t.category_name
        ? {
            name: categoryLabelPt(t.class.categoryLabel ?? t.category_name),
          }
        : t.class.categoryLabel
          ? { name: t.class.categoryLabel }
          : null,
      _displayLabel: t.class.displayLabel,
      _kind: t.class.kind,
      _pending: t.class.pending,
      _subLines: t.class.subLines,
      _installmentLabel: t.class.installmentLabel,
      _virouAjuda: Boolean(writeOff),
    }
  })

  const helpRows = helpAdj.map((a) => {
    let meta: { person?: string; originalDate?: string; originalAmount?: number } =
      {}
    try {
      meta = a.notes ? JSON.parse(a.notes) : {}
    } catch {
      meta = {}
    }
    return {
      id: a.id,
      date: a.date,
      person: meta.person ?? "Empréstimo",
      originalDate: meta.originalDate ?? a.date,
      originalAmount: meta.originalAmount ?? Math.abs(a.amount),
      amount: a.amount,
    }
  })

  const loanDecorated = decorateTransactions(
    dedupeTransactions(loanRows.map(mapRow), {
      primaryAccountIds: primaryAccountIds(banks),
    }),
    {}
  )
  const loans = groupLoans(loanDecorated, decodedAdj)

  const displayCategories = (categoryRows as Category[]).map((c) => ({
    ...c,
    name: categoryLabelPt(c.name),
  }))

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Suspense>
        <TransacoesClient
          transactions={mapped as (Transaction & {
            accounts?: { name: string } | null
            categories?: { name: string } | null
            _displayLabel?: string | null
            _kind?: string
            _pending?: boolean
            _subLines?: { label: string; amount: number }[]
            _installmentLabel?: string | null
            _virouAjuda?: boolean
          })[]}
          categories={displayCategories}
          yearMonth={yearMonth}
          from={from ?? ""}
          to={to ?? ""}
          summary={{
            entrou,
            saiu,
            sobrou: entrou - saiu,
            cardBill,
            between,
            loanOut,
            loanIn,
            loanRemaining: loans.reduce((s, l) => s + l.remaining, 0),
          }}
          hiddenDuplicates={hiddenDuplicates.map((t) => ({
            id: t.id,
            description: t.description,
            amount: Number(t.amount) || 0,
            accountName: t.accounts?.name ?? "",
          }))}
          loans={loans}
          helpRows={helpRows}
        />
      </Suspense>
    </div>
  )
}
