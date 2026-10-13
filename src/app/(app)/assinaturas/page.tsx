import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { accounts, transactions } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { decAccount, decTransaction } from "@/lib/crypto/rows"
import { detectRecurrences } from "@/lib/recurrences"
import { todayYmd } from "@/lib/format"
import { loadUserSettings } from "@/lib/user-settings"
import { AssinaturasClient } from "@/components/assinaturas-client"
import {
  accountIdsForBank,
  bankFromParams,
  dedupeTransactions,
  groupAccountsByBank,
  primaryAccountIds,
} from "@/lib/banks"

export default async function AssinaturasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { userId } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)
  const asOf = todayYmd()
  const settings = await loadUserSettings(crypto)
  const params = await searchParams
  const bank = bankFromParams(params.bank)

  const [accountRows, txnRows] = await Promise.all([
    db
      .select()
      .from(accounts)
      .where(and(eq(accounts.user_id, userId), eq(accounts.is_active, true))),
    db
      .select()
      .from(transactions)
      .where(eq(transactions.user_id, userId))
      .orderBy(desc(transactions.date))
      .limit(4000),
  ])

  const decodedAccounts = accountRows.map((a) => decAccount(crypto, a))
  const banks = groupAccountsByBank(decodedAccounts)
  const bankIds = accountIdsForBank(banks, bank)
  const allowed = bankIds ? new Set(bankIds) : null
  const accName = new Map(
    decodedAccounts.map((a) => [a.id, a.name])
  )
  const txns = dedupeTransactions(
    txnRows.map((t) => {
      const d = decTransaction(crypto, t)
      return {
        id: d.id,
        date: d.date,
        amount: d.amount,
        merchant: d.merchant,
        description: d.description,
        account_id: d.account_id,
        accountName: accName.get(d.account_id) ?? "",
      }
    }),
    { primaryAccountIds: primaryAccountIds(banks) }
  ).filter((t) => !allowed || allowed.has(t.account_id))
  const { series, warnings, ended } = detectRecurrences(txns, asOf)
  const visibleWarnings = warnings.filter(
    (w) => !settings.dismissedWarningKeys.includes(w.key)
  )
  const monthly = series.reduce((s, r) => s + r.monthly, 0)
  const ai = series.filter((r) => r.isAi)

  return (
    <AssinaturasClient
      series={series}
      warnings={visibleWarnings}
      ended={ended}
      monthly={monthly}
      aiTotal={ai.reduce((s, r) => s + r.monthly, 0)}
      aiCount={ai.length}
    />
  )
}
