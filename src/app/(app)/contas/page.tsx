import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import {
  accounts,
  balanceSnapshots,
  investmentPositions,
  pluggyConnections,
} from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { decAccount, decPosition } from "@/lib/crypto/rows"
import { parseAccountMeta } from "@/lib/account-meta"
import { groupAccountsByBank } from "@/lib/banks"
import { titledPosition } from "@/lib/investments/net"
import { roundCents } from "@/lib/money-math"
import { todayYmd } from "@/lib/format"
import { fetchItem, getApiKey } from "@/lib/pluggy/client"
import { ContasClient } from "@/components/contas-client"

function hoursAgo(date: Date) {
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 3_600_000))
}

export default async function ContasPage() {
  const { userId } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)
  const asOf = todayYmd()

  const [accountRows, snapRows, posRows, pluggyRow] = await Promise.all([
    db
      .select()
      .from(accounts)
      .where(and(eq(accounts.user_id, userId), eq(accounts.is_active, true))),
    db
      .select()
      .from(balanceSnapshots)
      .where(eq(balanceSnapshots.user_id, userId)),
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
      .from(pluggyConnections)
      .where(eq(pluggyConnections.user_id, userId))
      .limit(1),
  ])

  const decoded = accountRows.map((a) => {
    const d = decAccount(crypto, a)
    return { ...d, extra: parseAccountMeta(d.extra_meta) }
  })
  const banks = groupAccountsByBank(decoded)
  const titles = posRows.map((p) =>
    titledPosition(decPosition(crypto, p), asOf)
  )

  let itemStatus: {
    ok: boolean
    label: string
    updatedAt: Date | null
  } = { ok: false, label: "Sem conexão", updatedAt: null }

  try {
    const itemId = pluggyRow[0]
      ? crypto.decryptFlex("item_id", pluggyRow[0].item_id)
      : null
    if (itemId) {
      const apiKey = await getApiKey()
      const item = await fetchItem(apiKey, itemId)
      const ok = item.status === "UPDATED" || item.status === "UPDATING"
      itemStatus = {
        ok,
        label: item.status,
        updatedAt: pluggyRow[0]?.updated_at ?? null,
      }
    }
  } catch {
    itemStatus = {
      ok: false,
      label: "Erro ao atualizar",
      updatedAt: pluggyRow[0]?.updated_at ?? null,
    }
  }

  const cards = banks.map((b) => {
    const accs = decoded.filter((a) => b.accountIds.includes(a.id))
    const balIds = new Set(b.balanceAccountIds)
    const checking = accs.filter((a) => a.type === "checking" && balIds.has(a.id))
    const credit = accs.filter((a) => a.type === "credit_card" && balIds.has(a.id))
    const investAccIds = new Set(
      accs.filter((a) => a.type === "investment").map((a) => a.id)
    )
    const checkingBal = checking.reduce((s, a) => {
      if (!balIds.has(a.id)) return s
      const snap = snapRows.find((x) => x.account_id === a.id)
      return s + (snap ? crypto.decryptNum("balance", snap.balance) : 0)
    }, 0)
    const investNet = titles
      .filter((t) => {
        const pos = posRows.find((p) => p.id === t.id)
        return pos && investAccIds.has(pos.account_id)
      })
      .reduce((s, t) => s + t.net, 0)
    const latestSnap = snapRows
      .filter((s) => b.accountIds.includes(s.account_id))
      .map((s) => s.updated_at)
      .sort((a, b) => b.getTime() - a.getTime())[0]
    const hours = latestSnap ? hoursAgo(latestSnap) : itemStatus.updatedAt ? hoursAgo(itemStatus.updatedAt) : null
    const stale = hours != null && hours >= 72
    return {
      key: b.key,
      name: b.name,
      ok: itemStatus.ok && !stale,
      hours,
      stale,
      itemCount: b.balanceAccountIds.length,
      checking: checking.map((a) => ({
        name: a.name,
        balance: checkingBal,
      })),
      checkingBalance: checkingBal,
      cards: credit.map((a) => {
        const snap = snapRows.find((x) => x.account_id === a.id)
        const fatura = snap ? crypto.decryptNum("balance", snap.balance) : 0
        const limit = a.extra?.creditLimit ?? 0
        const available =
          a.extra?.availableCreditLimit ??
          (limit > 0 ? Math.max(0, limit - fatura) : 0)
        return {
          name: a.name,
          last4: a.last4,
          fatura,
          available,
          limit,
        }
      }),
      investmentsNet: roundCents(investNet),
      investCount: titles.filter((t) => {
        const pos = posRows.find((p) => p.id === t.id)
        return pos && investAccIds.has(pos.account_id)
      }).length,
      total: roundCents(checkingBal + investNet),
      statusLabel: itemStatus.label,
    }
  })

  return <ContasClient banks={cards} />
}
