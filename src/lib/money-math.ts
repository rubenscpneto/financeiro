/** IOF % of earnings for calendar days 1…29. Day 30+ is 0%. */
const IOF_PCT = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36,
  33, 30, 26, 23, 20, 16, 13, 10, 6, 3,
] as const

export function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calendarDays(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso.slice(0, 10)}T00:00:00`)
  const to = Date.parse(`${toIso.slice(0, 10)}T00:00:00`)
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0
  return Math.max(0, Math.round((to - from) / 86_400_000))
}

export function holdingDays(appliedOn: string, asOf: string): number {
  return calendarDays(appliedOn, asOf)
}

export function iofRate(days: number): number {
  if (!Number.isFinite(days) || days >= 30) return 0
  const d = Math.max(1, Math.floor(days))
  return IOF_PCT[d - 1] / 100
}

export function iofOnEarnings(earnings: number, days: number): number {
  if (earnings <= 0) return 0
  return roundCents(earnings * iofRate(days))
}

export function irRate(days: number): number {
  if (days <= 180) return 0.225
  if (days <= 360) return 0.2
  if (days <= 720) return 0.175
  return 0.15
}

export function irOnEarnings(
  earnings: number,
  iof: number,
  days: number
): number {
  const base = roundCents(earnings - iof)
  if (base <= 0) return 0
  return roundCents(base * irRate(days))
}

export type TitleNet = {
  earnings: number
  iof: number
  ir: number
  net: number
}

/** Net assumes a redemption today: gross − IOF − IR, IOF first. */
export function titleNet(
  gross: number,
  invested: number,
  days: number
): TitleNet {
  const earnings = roundCents(gross - invested)
  const iof = iofOnEarnings(Math.max(0, earnings), days)
  const ir = irOnEarnings(Math.max(0, earnings), iof, days)
  return {
    earnings,
    iof,
    ir,
    net: roundCents(gross - iof - ir),
  }
}

/** CDI period return = Π(1 + r_d/100) − 1 for published daily rates (% a.d.). */
export function cdiPeriodReturn(dailyRatesPercent: number[]): number {
  if (dailyRatesPercent.length === 0) return 0
  let product = 1
  for (const r of dailyRatesPercent) {
    product *= 1 + r / 100
  }
  return product - 1
}

export function rendimentoExcludingFlows(input: {
  start: number
  end: number
  aportes: number
  resgates: number
}): number {
  return input.end - input.start - input.aportes + input.resgates
}

/** Yield in a window: end − start − principal in − + redemptions. */
export function periodRendimento(input: {
  start: number
  end: number
  movementAportes: number
  movementResgates: number
  principalApplied: number
}): number {
  return rendimentoExcludingFlows({
    start: input.start,
    end: input.end,
    aportes: Math.max(input.movementAportes, input.principalApplied),
    resgates: input.movementResgates,
  })
}

/** % do CDI = rendimento ÷ (saldo médio × CDI do período). Returns 1.016 for 101.6%. */
export function pctOfCdi(
  rendimento: number,
  averageBalance: number,
  cdiPeriod: number
): number {
  const denom = averageBalance * cdiPeriod
  if (denom <= 0) return 0
  return rendimento / denom
}

export function weightedContractedCdi(
  titles: { gross: number; pctCdi: number }[]
): number {
  const weight = titles.reduce((sum, t) => sum + t.gross, 0)
  if (weight <= 0) return 0
  return titles.reduce((sum, t) => sum + t.gross * t.pctCdi, 0) / weight
}

export function reservaLivre(
  disponivelHoje: number,
  openBills: number
): number {
  return roundCents(disponivelHoje - openBills)
}

export function splitReserveNets(
  titles: { net: number; locked: boolean; excludeFromReserve: boolean }[]
): { liquid: number; locked: number; excluded: number; preso: number } {
  let liquid = 0
  let locked = 0
  let excluded = 0
  for (const t of titles) {
    if (t.excludeFromReserve) excluded += t.net
    else if (t.locked) locked += t.net
    else liquid += t.net
  }
  const lockedR = roundCents(locked)
  const excludedR = roundCents(excluded)
  return {
    liquid: roundCents(liquid),
    locked: lockedR,
    excluded: excludedR,
    preso: roundCents(lockedR + excludedR),
  }
}

/** Daily-liquidity titles stay available; far-maturity CDBs do not. */
export function isCdbLocked(
  p: { name?: string | null; dueDate?: string | null },
  asOf: string
): boolean {
  const name = (p.name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  if (/liquidez\s+diaria/.test(name)) return false
  if (p.dueDate && holdingDays(asOf, p.dueDate) > 60) return true
  const asOfY = Number(asOf.slice(0, 4))
  if (Number.isFinite(asOfY)) {
    for (const m of name.matchAll(/\b(20\d{2})\b/g)) {
      if (Number(m[1]) - asOfY >= 2) return true
    }
  }
  return false
}

export function reserveTarget(recurringSpend: number): number {
  return roundCents(6 * recurringSpend)
}

export function reserveMonths(value: number, recurringSpend: number): number {
  if (recurringSpend <= 0) return 0
  return value / recurringSpend
}

export function reserveProgress(livre: number, target: number): number {
  if (target <= 0) return 0
  return livre / target
}

export function irBandLabel(days: number): string {
  if (days <= 180) return "Até 180 dias"
  if (days <= 360) return "181 a 360 dias"
  if (days <= 720) return "361 a 720 dias"
  return "Mais de 720 dias"
}
