import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import {
  accounts,
  adjustments,
  balanceSnapshots,
  goals,
  investmentPositions,
  transactions,
} from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import {
  decAccount,
  decAdjustment,
  decPosition,
  decTransaction,
} from "@/lib/crypto/rows"
import { MetasClient } from "@/components/metas-client"
import { currentYearMonth, todayYmd } from "@/lib/format"
import { titledPosition } from "@/lib/investments/net"
import { buildReserve, recurringMonthlySpend } from "@/lib/reserve"
import { roundCents } from "@/lib/money-math"
import { decorateTransactions } from "@/lib/txn-class"
import { groupLoans } from "@/lib/loans"
import type { Goal } from "@/lib/types"

export default async function MetasPage() {
  const { userId } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)
  const asOf = todayYmd()
  const ym = currentYearMonth()

  const [goalRows, positionRows, snapRows, accountRows, txnRows, adjRows] =
    await Promise.all([
      db
        .select()
        .from(goals)
        .where(eq(goals.user_id, userId))
        .orderBy(desc(goals.created_at), desc(goals.id)),
      db
        .select()
        .from(investmentPositions)
        .where(
          and(
            eq(investmentPositions.user_id, userId),
            eq(investmentPositions.is_active, true)
          )
        ),
      db
        .select()
        .from(balanceSnapshots)
        .where(eq(balanceSnapshots.user_id, userId)),
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
      db
        .select()
        .from(adjustments)
        .where(eq(adjustments.user_id, userId)),
    ])

  const mappedGoals = goalRows.map((g) => ({
    ...g,
    name: crypto.decryptFlex("name", g.name) ?? g.name,
    target_amount: crypto.decryptNum("target_amount", g.target_amount),
    current_amount: crypto.decryptNum("current_amount", g.current_amount),
  })) as Goal[]

  const titles = positionRows.map((p) =>
    titledPosition(decPosition(crypto, p), asOf)
  )
  const liquid = titles.filter((t) => !t.locked).reduce((s, t) => s + t.net, 0)
  const checking = snapRows
    .filter((s) => s.source_type === "checking")
    .reduce((s, r) => s + crypto.decryptNum("balance", r.balance), 0)
  const accountsDecoded = accountRows.map((a) => decAccount(crypto, a))
  const billLines = accountsDecoded
    .filter((a) => a.type === "credit_card")
    .map((a) => {
      const snap = snapRows.find((s) => s.account_id === a.id)
      return {
        name: a.name,
        amount: snap ? crypto.decryptNum("balance", snap.balance) : 0,
      }
    })
    .filter((b) => b.amount > 0)

  const txns = txnRows.map((t) => decTransaction(crypto, t))
  const decorated = decorateTransactions(txns)
  const adj = adjRows.map((a) => decAdjustment(crypto, a))
  const loans = groupLoans(decorated, adj)
  const helpAdj = adj.filter((a) => a.kind === "family_help" && !a.undone_at)
  const refundsPending = decorated.filter(
    (t) => t.class.kind === "refund" && t.class.pending
  )
  const monthSpend =
    decorated
      .filter((t) => t.date?.startsWith(ym) && !t.class.hide)
      .reduce((s, t) => s + t.class.expenseDelta, 0) +
    helpAdj
      .filter((a) => a.date.startsWith(ym))
      .reduce((s, a) => s + Math.abs(a.amount), 0)

  const reserve = buildReserve({
    disponivel: roundCents(liquid + checking),
    openBills: billLines,
    recurringSpend: recurringMonthlySpend(txns, ym),
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

  return (
    <MetasClient
      goals={mappedGoals}
      reserve={reserve}
      loans={loans}
      refunds={refundsPending.map((t) => ({
        id: t.id,
        name: t.description ?? "Estorno",
        amount: Math.abs(Number(t.amount) || 0),
      }))}
      helpRows={helpRows}
      monthSpend={monthSpend}
    />
  )
}
