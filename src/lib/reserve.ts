import { decorateTransactions, type ClassifiableTxn } from "@/lib/txn-class"
import { monthBounds, shiftYearMonth } from "@/lib/format"
import { reservaLivre, reserveMonths, reserveTarget } from "@/lib/money-math"
import { detectRecurrences } from "@/lib/recurrences"

const ONE_OFF =
  /\b(airbnb|viagem|hotel|passagem|curso|udemy|hotmart|oculos|óculos|anuidade|tarifa anual)\b/i

export type ReserveView = {
  recurringSpend: number
  disponivel: number
  openBills: number
  livre: number
  target: number
  monthsLivre: number
  monthsDisponivel: number
  progress: number
  falta: number
  billLines: { name: string; amount: number }[]
}

export function isOneOffTxn(t: {
  description?: string | null
  merchant?: string | null
  source_category?: string | null
  installment?: string | null
}) {
  const text = `${t.description ?? ""} ${t.merchant ?? ""} ${t.source_category ?? ""}`
  if (ONE_OFF.test(text)) return true
  if (/\b(travel|education)\b/i.test(text) && t.installment) return true
  return false
}

export function recurringMonthlySpend(
  txns: (ClassifiableTxn & { id?: string; accountName?: string | null })[],
  asOfYm: string,
  months = 6
): number {
  const totals: number[] = []
  for (let i = 0; i < months; i++) {
    const ym = shiftYearMonth(asOfYm, -i)
    const { start, end } = monthBounds(ym)
    const decorated = decorateTransactions(txns, { yearMonth: ym, from: start, to: end })
    const spend = decorated
      .filter((t) => !t.class.hide && t.class.expenseDelta > 0 && !isOneOffTxn(t))
      .reduce((s, t) => s + t.class.expenseDelta, 0)
    totals.push(spend)
  }
  const avg = totals.reduce((s, n) => s + n, 0) / Math.max(totals.length, 1)
  const recurrences = detectRecurrences(
    txns
      .filter((t) => (Number(t.amount) || 0) < 0)
      .map((t) => ({
        id: t.id ?? "",
        date: t.date ?? `${asOfYm}-01`,
        amount: Number(t.amount) || 0,
        merchant: t.merchant,
        description: t.description,
        accountName: t.accountName,
      })),
    `${asOfYm}-28`
  )
  const subTotal = recurrences.series.reduce((s, r) => s + r.monthly, 0)
  return Math.max(avg, subTotal)
}

export function buildReserve(input: {
  disponivel: number
  openBills: { name: string; amount: number }[]
  recurringSpend: number
}): ReserveView {
  const billSum = input.openBills.reduce((s, b) => s + b.amount, 0)
  const livre = reservaLivre(input.disponivel, billSum)
  const target = reserveTarget(input.recurringSpend)
  return {
    recurringSpend: input.recurringSpend,
    disponivel: input.disponivel,
    openBills: billSum,
    livre,
    target,
    monthsLivre: reserveMonths(livre, input.recurringSpend),
    monthsDisponivel: reserveMonths(input.disponivel, input.recurringSpend),
    progress: target > 0 ? livre / target : 0,
    falta: Math.max(0, target - livre),
    billLines: input.openBills,
  }
}
