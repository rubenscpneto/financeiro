import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import {
  accounts,
  balanceSnapshots,
  categories,
  investmentMovements,
  investmentPositions,
  transactions,
} from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { decAccount, decMovement, decPosition } from "@/lib/crypto/rows"
import { currentYearMonth, monthBounds, todayYmd } from "@/lib/format"
import {
  accountIdsForBank,
  balanceIdsForBank,
  bankFromParams,
  bankHeadlineSuffix,
  groupAccountsByBank,
} from "@/lib/banks"
import { getCdiRates } from "@/lib/cdi"
import {
  groupTitles,
  irBands,
  periodCdiKpi,
  titledPosition,
} from "@/lib/investments/net"
import { parseAccountMeta } from "@/lib/account-meta"
import { buildReserve, recurringMonthlySpend } from "@/lib/reserve"
import { roundCents, splitReserveNets } from "@/lib/money-math"
import { InvestimentosClient } from "@/components/investimentos-client"
import type { ClassifiableTxn as Txn } from "@/lib/txn-class"

export default async function InvestimentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { userId } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)
  const params = await searchParams
  const bank = bankFromParams(params.bank)
  const asOf = todayYmd()
  const ym = currentYearMonth()
  const monthStart = monthBounds(ym).start
  const yearAgo = `${Number(asOf.slice(0, 4)) - 1}${asOf.slice(4)}`

  const [positionRows, movementRows, accountRows, snapRows, txnRows, categoryRows] =
    await Promise.all([
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
        .from(investmentMovements)
        .where(eq(investmentMovements.user_id, userId))
        .orderBy(desc(investmentMovements.date)),
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
      db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.user_id, userId)),
    ])

  const accountsDecoded = accountRows.map((a) => {
    const d = decAccount(crypto, a)
    return { ...d, extra: parseAccountMeta(d.extra_meta) }
  })
  const banks = groupAccountsByBank(accountsDecoded)
  const scopedIds =
    accountIdsForBank(banks, bank) ??
    banks.flatMap((g) => g.accountIds)
  const balIds =
    balanceIdsForBank(banks, bank) ??
    banks.flatMap((g) => g.balanceAccountIds)
  const bankSuffix = bankHeadlineSuffix(banks, bank)
  const scopedAcc = new Set(scopedIds)
  const balAcc = new Set(balIds)
  const titles = positionRows
    .filter((p) => balAcc.has(p.account_id))
    .map((p) => titledPosition(decPosition(crypto, p), asOf))
  const movs = movementRows
    .filter((m) => scopedAcc.has(m.account_id))
    .map((m) => decMovement(crypto, m))
  const groups = groupTitles(titles)
  const gross = roundCents(titles.reduce((s, t) => s + t.gross, 0))
  const net = roundCents(titles.reduce((s, t) => s + t.net, 0))
  const iof = roundCents(titles.reduce((s, t) => s + t.iof, 0))
  const ir = roundCents(titles.reduce((s, t) => s + t.ir, 0))
  const earnings = roundCents(titles.reduce((s, t) => s + t.earnings, 0))
  const split = splitReserveNets(titles)
  const liquid = split.liquid
  const locked = split.locked
  const excluded = split.excluded

  const checking = snapRows
    .filter((s) => s.source_type === "checking" && balAcc.has(s.account_id))
    .reduce((s, r) => s + crypto.decryptNum("balance", r.balance), 0)
  const disponivel = roundCents(liquid + checking)

  const billLines = accountsDecoded
    .filter((a) => a.type === "credit_card" && balAcc.has(a.id))
    .map((a) => {
      const snap = snapRows.find((s) => s.account_id === a.id)
      const amount = snap ? crypto.decryptNum("balance", snap.balance) : 0
      return { name: a.name, amount }
    })
    .filter((b) => b.amount > 0)

  const catById = new Map(categoryRows.map((c) => [c.id, c.name]))
  const txns: Txn[] = txnRows
    .filter((t) => scopedAcc.has(t.account_id))
    .map((t) => ({
    ...t,
    amount: crypto.decryptNum("amount", t.amount),
    description: crypto.decryptFlex("description", t.description),
    merchant: crypto.decryptFlex("merchant", t.merchant),
    installment: crypto.decryptFlex("installment", t.installment),
    notes: crypto.decryptFlex("notes", t.notes),
    source_category: crypto.decryptFlex("source_category", t.source_category),
    category_name: t.category_id ? catById.get(t.category_id) ?? null : null,
    user_category_name: t.user_category_id
      ? catById.get(t.user_category_id) ?? null
      : null,
  }))

  const recurring = recurringMonthlySpend(txns, ym)
  const reserve = buildReserve({
    disponivel,
    openBills: billLines,
    recurringSpend: recurring,
    excluded,
  })

  const rates = await getCdiRates(yearAgo, asOf)
  const monthRates = rates.filter((r) => r.date >= monthStart && r.date <= asOf)
  const lastPublished = monthRates.at(-1)?.date ?? asOf
  const monthKpi = periodCdiKpi(
    titles,
    movs,
    rates,
    monthStart,
    lastPublished
  )
  const yearKpi = periodCdiKpi(titles, movs, rates, yearAgo, lastPublished)
  const vencimentos = titles
    .filter((t) => t.dueDate && t.dueDate >= asOf)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 8)

  return (
    <InvestimentosClient
      net={net}
      gross={gross}
      iof={iof}
      ir={ir}
      earnings={earnings}
      liquid={liquid}
      locked={locked}
      excluded={excluded}
      groups={groups}
      monthKpi={monthKpi}
      yearKpi={yearKpi}
      reserve={reserve}
      vencimentos={vencimentos.map((t) => ({
        date: t.dueDate!,
        name: t.name,
        gross: t.gross,
      }))}
      bands={irBands(titles)}
      iofNotes={titles.filter((t) => t.iof > 0)}
      bankSuffix={bankSuffix}
    />
  )
}
