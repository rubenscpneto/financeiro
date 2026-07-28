import { currentYearMonth, monthBounds, shiftYearMonth } from "@/lib/format"

export type EvolutionPoint = {
  /** YYYY-MM for sorting/filtering */
  yearMonth: string
  /** MM/YY for X axis */
  label: string
  value: number
}

/** Position snapshot used to rebuild the chart (same dates as Ativos). */
export type EvolutionPosition = {
  /** YYYY-MM-DD — purchase_date / issueDate */
  purchaseDate: string
  invested: number
  current: number
}

function labelFromYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-")
  return `${m}/${y.slice(2)}`
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a)
  return Math.max(0, Math.round(ms / 86_400_000))
}

/**
 * Monthly portfolio evolution from Ativos dates/values.
 * Each position contributes from its purchaseDate, growing linearly
 * from invested → current through today (no reliance on movement dates).
 */
export function buildInvestmentEvolution(
  positions: EvolutionPosition[],
  months = 12,
  asOf: Date = new Date()
): EvolutionPoint[] {
  const endYm = currentYearMonth(asOf)
  const asOfIso = asOf.toISOString().slice(0, 10)
  const monthKeys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    monthKeys.push(shiftYearMonth(endYm, -i))
  }

  const active = positions.filter(
    (p) =>
      p.purchaseDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(p.purchaseDate) &&
      Number.isFinite(p.current)
  )

  return monthKeys.map((ym) => {
    const { end: monthEnd } = monthBounds(ym)
    let value = 0

    for (const p of active) {
      if (p.purchaseDate > monthEnd) continue

      const span = daysBetween(p.purchaseDate, asOfIso)
      if (span <= 0) {
        value += p.current
        continue
      }

      const held = daysBetween(p.purchaseDate, monthEnd)
      const t = Math.min(1, held / span)
      const invested = Number.isFinite(p.invested) ? p.invested : p.current
      value += invested + t * (p.current - invested)
    }

    return {
      yearMonth: ym,
      label: labelFromYearMonth(ym),
      value: Math.round(value * 100) / 100,
    }
  })
}

export function sliceEvolution(
  series: EvolutionPoint[],
  months: 3 | 6 | 12
): EvolutionPoint[] {
  if (series.length <= months) return series
  return series.slice(series.length - months)
}
