import { currentYearMonth, shiftYearMonth } from "@/lib/format"

export type EvolutionPoint = {
  /** YYYY-MM for sorting/filtering */
  yearMonth: string
  /** MM/YY for X axis */
  label: string
  value: number
}

export type CashFlowMovement = {
  date: string
  type: "aporte" | "resgate" | "provento" | "outro"
  amount: number
}

function yearMonthFromDate(isoDate: string): string {
  return isoDate.slice(0, 7)
}

function labelFromYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-")
  return `${m}/${y.slice(2)}`
}

/**
 * Reconstruct monthly portfolio totals by walking cash-flows backwards
 * from the current total (aporte undoes as −, resgate as +).
 */
export function buildInvestmentEvolution(
  currentTotal: number,
  movements: CashFlowMovement[],
  months = 12,
  asOf: Date = new Date()
): EvolutionPoint[] {
  const endYm = currentYearMonth(asOf)
  const monthKeys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    monthKeys.push(shiftYearMonth(endYm, -i))
  }

  const byMonth = new Map<string, { aportes: number; resgates: number }>()
  for (const m of movements) {
    if (m.type !== "aporte" && m.type !== "resgate") continue
    const ym = yearMonthFromDate(m.date)
    const bucket = byMonth.get(ym) ?? { aportes: 0, resgates: 0 }
    const amt = Math.abs(Number(m.amount) || 0)
    if (m.type === "aporte") bucket.aportes += amt
    else bucket.resgates += amt
    byMonth.set(ym, bucket)
  }

  // Walk from end → start, recording end-of-month value then undoing that month's flows
  const valuesDesc: number[] = []
  let running = Math.max(0, currentTotal)
  for (let i = monthKeys.length - 1; i >= 0; i--) {
    valuesDesc.push(running)
    const flows = byMonth.get(monthKeys[i]!)
    if (flows) {
      running = running - flows.aportes + flows.resgates
      if (running < 0) running = 0
    }
  }
  valuesDesc.reverse()

  return monthKeys.map((ym, i) => ({
    yearMonth: ym,
    label: labelFromYearMonth(ym),
    value: Math.round((valuesDesc[i] ?? 0) * 100) / 100,
  }))
}

export function sliceEvolution(
  series: EvolutionPoint[],
  months: 3 | 6 | 12
): EvolutionPoint[] {
  if (series.length <= months) return series
  return series.slice(series.length - months)
}
