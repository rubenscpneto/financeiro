import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { accounts, transactions } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { decTransaction } from "@/lib/crypto/rows"
import { detectRecurrences } from "@/lib/recurrences"
import { todayYmd } from "@/lib/format"
import { loadUserSettings } from "@/lib/user-settings"
import { AssinaturasClient } from "@/components/assinaturas-client"

export default async function AssinaturasPage() {
  const { userId } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)
  const asOf = todayYmd()
  const settings = await loadUserSettings(crypto)

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

  const accName = new Map(
    accountRows.map((a) => [
      a.id,
      crypto.decryptFlex("name", a.name) ?? a.name,
    ])
  )
  const txns = txnRows.map((t) => {
    const d = decTransaction(crypto, t)
    return {
      id: d.id,
      date: d.date,
      amount: d.amount,
      merchant: d.merchant,
      description: d.description,
      accountName: accName.get(d.account_id) ?? "",
    }
  })
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
