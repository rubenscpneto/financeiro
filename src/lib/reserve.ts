import { type ClassifiableTxn } from "@/lib/txn-class"
import { reservaLivre, reserveMonths, reserveTarget } from "@/lib/money-math"
import { recurringMonthlySpend as merchantRecurringSpend } from "@/lib/recurrences"

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
  excluded: number
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
  months = 3
): number {
  return merchantRecurringSpend(txns, asOfYm, months)
}

export function buildReserve(input: {
  disponivel: number
  openBills: { name: string; amount: number }[]
  recurringSpend: number
  excluded?: number
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
    excluded: input.excluded ?? 0,
  }
}
