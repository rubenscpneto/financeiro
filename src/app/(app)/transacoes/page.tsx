import { Suspense } from "react"
import { and, desc, eq, gte, lte } from "drizzle-orm"
import { db } from "@/db"
import { accounts, categories, transactions } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { decAccount, decTransaction } from "@/lib/crypto/rows"
import { TransacoesClient } from "@/components/transacoes-client"
import { currentYearMonth, monthBounds } from "@/lib/format"
import type { Account, Category, Transaction } from "@/lib/types"

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { userId } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)
  const params = await searchParams

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

  const filters = [eq(transactions.user_id, userId)]
  if (params.account_id) filters.push(eq(transactions.account_id, params.account_id))
  if (params.category_id) filters.push(eq(transactions.category_id, params.category_id))
  if (from) filters.push(gte(transactions.date, from))
  if (to) filters.push(lte(transactions.date, to))

  const [txnRows, accountRows, categoryRows] = await Promise.all([
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
      .select()
      .from(accounts)
      .where(and(eq(accounts.user_id, userId), eq(accounts.is_active, true))),
    db
      .select()
      .from(categories)
      .where(eq(categories.user_id, userId))
      .orderBy(categories.name, categories.id),
  ])

  const mapped = txnRows.map((row) => {
    const txn = decTransaction(crypto, row.txn)
    const accountName = row.account_name
      ? crypto.decryptFlex("name", row.account_name)
      : null
    return {
      ...txn,
      accounts: accountName ? { name: accountName } : null,
      categories: row.category_name ? { name: row.category_name } : null,
    }
  })
  const decodedAccounts = accountRows
    .map((a) => decAccount(crypto, a))
    .sort(
      (a, b) => a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id)
    )

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
          transactions={mapped as (Transaction & {
            accounts?: { name: string } | null
            categories?: { name: string } | null
          })[]}
          accounts={decodedAccounts as Account[]}
          categories={categoryRows as Category[]}
          yearMonth={yearMonth}
          from={from ?? ""}
          to={to ?? ""}
        />
      </Suspense>
    </div>
  )
}
