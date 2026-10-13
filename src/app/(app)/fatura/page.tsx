import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { accounts, balanceSnapshots, transactions } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { decAccount, decTransaction } from "@/lib/crypto/rows"
import { parseAccountMeta } from "@/lib/account-meta"
import {
  cardSchedule,
  currentAndNextCycles,
  futureInstallments,
  itemsForCycle,
} from "@/lib/card-cycles"
import { decorateTransactions } from "@/lib/txn-class"
import { todayYmd } from "@/lib/format"
import { FaturaClient } from "@/components/fatura-client"
import {
  accountIdsForBank,
  balanceIdsForBank,
  bankFromParams,
  dedupeTransactions,
  groupAccountsByBank,
  primaryAccountIds,
  resolveBank,
} from "@/lib/banks"

export default async function FaturaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { userId } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)
  const params = await searchParams
  const bank = bankFromParams(params.bank)
  const asOf = todayYmd()

  const [accountRows, snapRows, txnRows] = await Promise.all([
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
      .from(transactions)
      .where(eq(transactions.user_id, userId))
      .orderBy(desc(transactions.date))
      .limit(4000),
  ])

  const decoded = accountRows.map((a) => decAccount(crypto, a))
  const banks = groupAccountsByBank(decoded)
  const scopedIds = accountIdsForBank(banks, bank)
  const displayIds = new Set(
    (balanceIdsForBank(banks, bank) ??
      banks.flatMap((g) => g.balanceAccountIds)).filter((id) =>
      scopedIds == null ? true : scopedIds.includes(id)
    )
  )
  const cards = decoded
    .filter((a) => a.type === "credit_card")
    .filter((a) => displayIds.has(a.id))
    .map((a) => ({
      ...a,
      extra: parseAccountMeta(a.extra_meta),
      last4: a.last4,
      institution: resolveBank(a).name,
    }))

  const selectedId =
    params.card && cards.some((c) => c.id === params.card)
      ? params.card
      : cards[0]?.id ?? null

  const txns = decorateTransactions(
    dedupeTransactions(
      txnRows.map((t) => ({
        ...decTransaction(crypto, t),
      })),
      { primaryAccountIds: primaryAccountIds(banks) }
    )
  )
  const selected = cards.find((c) => c.id === selectedId) ?? null
  const { closeDay, dueDay } = cardSchedule(selected?.extra ?? null)
  const cycles = selected
    ? currentAndNextCycles(asOf, closeDay, dueDay)
    : []
  const current = cycles[0]
  const items = selected && current
    ? itemsForCycle(txns, selected.id, current, closeDay, dueDay)
    : []
  const future = selected && current
    ? futureInstallments(txns, selected.id, current.dueYm, closeDay, dueDay)
    : []
  const aVista = items
    .filter((i) => !i.installmentTotal)
    .reduce((s, i) => s + Math.abs(i.amount), 0)
  const parcelas = items
    .filter((i) => i.installmentTotal)
    .reduce((s, i) => s + Math.abs(i.amount), 0)
  const currentTotal = aVista + parcelas
  const futureTotal = future.reduce(
    (s, g) => s + g.items.reduce((ss, i) => ss + Math.abs(i.amount), 0),
    0
  )
  const snap = selected
    ? snapRows.find((s) => s.account_id === selected.id)
    : null
  const openBalance = snap ? crypto.decryptNum("balance", snap.balance) : currentTotal
  const limit = selected?.extra?.creditLimit ?? 0
  const available =
    selected?.extra?.availableCreditLimit ??
    (limit > 0 ? Math.max(0, limit - openBalance - futureTotal) : 0)
  const used = limit > 0 ? limit - available : openBalance + futureTotal

  const lastPaid = txns.find(
    (t) =>
      (t.class.kind === "card_bill" || t.class.kind === "card_bill_hidden") &&
      t.account_id === selected?.id
  )

  const dueDate = current?.dueDate ?? null
  const daysToDue = dueDate
    ? Math.round(
        (Date.parse(`${dueDate}T00:00:00`) - Date.parse(`${asOf}T00:00:00`)) /
          86_400_000
      )
    : null

  return (
    <FaturaClient
      cards={cards.map((c) => ({
        id: c.id,
        name: c.name,
        last4: c.last4,
        brand: c.extra?.brand ?? null,
        institution: c.institution,
        amount: snapRows.find((s) => s.account_id === c.id)
          ? crypto.decryptNum(
              "balance",
              snapRows.find((s) => s.account_id === c.id)!.balance
            )
          : 0,
      }))}
      selectedId={selectedId}
      cycles={cycles}
      items={items}
      future={future}
      aVista={aVista}
      parcelas={parcelas}
      currentTotal={openBalance || currentTotal}
      futureTotal={futureTotal}
      limit={limit}
      available={available}
      used={used}
      closeDay={closeDay}
      dueDate={dueDate}
      daysToDue={daysToDue}
      lastPaid={
        lastPaid
          ? {
              date: lastPaid.date ?? "",
              amount: Math.abs(Number(lastPaid.amount) || 0),
              accountName: cards.find((c) => c.id === lastPaid.account_id)?.name ?? "",
            }
          : null
      }
    />
  )
}
