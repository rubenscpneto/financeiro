import {
  cdiPeriodReturn,
  holdingDays,
  irBandLabel,
  pctOfCdi,
  periodRendimento,
  roundCents,
  titleNet,
  weightedContractedCdi,
  isCdbLocked,
} from "@/lib/money-math"
import { positionCurrentValue, positionInvestedValue } from "@/lib/investments/value"
import type { CdiRate } from "@/lib/cdi"
import { todayYmd } from "@/lib/format"

export type PositionLike = {
  id: string
  asset_name: string
  purchase_date: string | null
  as_of: string
  due_date?: string | null
  rate: number | null
  rate_type: string | null
  amount_original: number | null
  amount_withdrawal: number | null
  quantity: number
  avg_price: number
  current_price: number
  exclude_from_reserve?: boolean | null
}

export type MovementLike = {
  date: string
  type: string
  amount: number
}

export type TitledPosition = {
  id: string
  name: string
  invested: number
  gross: number
  earnings: number
  iof: number
  ir: number
  net: number
  days: number
  dueDate: string | null
  purchaseDate: string | null
  pctCdi: number | null
  locked: boolean
  excludeFromReserve: boolean
}

function parsePctCdi(rate: number | null, rateType: string | null): number | null {
  if (rate == null || !Number.isFinite(rate)) return null
  const t = (rateType ?? "").toLowerCase()
  if (!t || t.includes("cdi") || t === "%") return rate
  return null
}

export function isLocked(p: PositionLike, asOf: string) {
  return isCdbLocked({ name: p.asset_name, dueDate: p.due_date ?? null }, asOf)
}

export function titledPosition(p: PositionLike, asOf: string): TitledPosition {
  const invested = positionInvestedValue(p)
  const gross = positionCurrentValue(p)
  const applied = p.purchase_date ?? p.as_of
  const days = holdingDays(applied, asOf)
  const net = titleNet(gross, invested, days)
  return {
    id: p.id,
    name: p.asset_name,
    invested,
    gross,
    earnings: net.earnings,
    iof: net.iof,
    ir: net.ir,
    net: net.net,
    days,
    dueDate: p.due_date ?? null,
    purchaseDate: applied,
    pctCdi: parsePctCdi(p.rate, p.rate_type),
    locked: isLocked(p, asOf),
    excludeFromReserve: Boolean(p.exclude_from_reserve),
  }
}

export type ProductGroup = {
  key: string
  name: string
  titles: TitledPosition[]
  net: number
  gross: number
  invested: number
  earnings: number
  iof: number
  ir: number
  locked: boolean
  pctCdi: number | null
}

function groupKey(p: TitledPosition): string {
  const locked = p.locked ? "locked" : "daily"
  const pct = p.pctCdi != null ? String(p.pctCdi) : "na"
  return `${locked}|${pct}`
}

function groupName(p: TitledPosition): string {
  if (p.locked && p.dueDate) {
    const pct = p.pctCdi != null ? `${p.pctCdi}% do CDI` : "renda fixa"
    const [y, m, d] = p.dueDate.split("-")
    return `Até ${d}/${m}/${y} · ${pct}`
  }
  if (p.pctCdi != null) return `Liquidez diária · ${p.pctCdi}% do CDI`
  return "Liquidez diária"
}

export function groupTitles(titles: TitledPosition[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>()
  for (const t of titles) {
    const key = groupKey(t)
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        key,
        name: groupName(t),
        titles: [t],
        net: t.net,
        gross: t.gross,
        invested: t.invested,
        earnings: t.earnings,
        iof: t.iof,
        ir: t.ir,
        locked: t.locked,
        pctCdi: t.pctCdi,
      })
    } else {
      existing.titles.push(t)
      existing.net = roundCents(existing.net + t.net)
      existing.gross = roundCents(existing.gross + t.gross)
      existing.invested = roundCents(existing.invested + t.invested)
      existing.earnings = roundCents(existing.earnings + t.earnings)
      existing.iof = roundCents(existing.iof + t.iof)
      existing.ir = roundCents(existing.ir + t.ir)
    }
  }
  for (const g of map.values()) {
    g.titles.sort((a, b) => (a.purchaseDate ?? "").localeCompare(b.purchaseDate ?? ""))
  }
  return [...map.values()].sort((a, b) => b.net - a.net)
}

function weekdayIso(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  const day = d.getDay()
  return day !== 0 && day !== 6
}

function interpolateBalance(titles: TitledPosition[], day: string) {
  let sum = 0
  for (const t of titles) {
    const start = t.purchaseDate ?? day
    if (day < start) continue
    const span = Math.max(1, holdingDays(start, todayYmd()) || t.days)
    const elapsed = Math.min(span, holdingDays(start, day))
    sum += t.invested + ((t.gross - t.invested) * elapsed) / span
  }
  return sum
}

export type CdiKpi = {
  rendimento: number
  averageBalance: number
  cdi: number
  pctOfCdi: number | null
  contractedPct: number | null
  usedContracted: boolean
  from: string
  to: string
  businessDays: number
}

export function periodCdiKpi(
  titles: TitledPosition[],
  movements: MovementLike[],
  rates: CdiRate[],
  from: string,
  to: string
): CdiKpi {
  const inPeriod = rates.filter((r) => r.date >= from && r.date <= to)
  const cdi = cdiPeriodReturn(inPeriod.map((r) => r.rate))
  const startBal = interpolateBalance(titles, from)
  const endBal = interpolateBalance(titles, to)
  const aportes = movements
    .filter((m) => m.type === "aporte" && m.date >= from && m.date <= to)
    .reduce((s, m) => s + Math.abs(m.amount), 0)
  const resgates = movements
    .filter((m) => m.type === "resgate" && m.date >= from && m.date <= to)
    .reduce((s, m) => s + Math.abs(m.amount), 0)
  const principalApplied = titles
    .filter((t) => {
      const d = t.purchaseDate
      return d && d >= from && d <= to
    })
    .reduce((s, t) => s + t.invested, 0)
  const rendimento = periodRendimento({
    start: startBal,
    end: endBal,
    movementAportes: aportes,
    movementResgates: resgates,
    principalApplied,
  })
  const days = (inPeriod.length ? inPeriod : rates.filter((r) => weekdayIso(r.date))).map(
    (r) => r.date
  )
  const sampleDays = inPeriod.map((r) => r.date)
  const avg =
    sampleDays.length > 0
      ? sampleDays.reduce((s, d) => s + interpolateBalance(titles, d), 0) /
        sampleDays.length
      : endBal
  const contracted = weightedContractedCdi(
    titles.filter((t) => t.pctCdi != null).map((t) => ({ gross: t.gross, pctCdi: t.pctCdi! }))
  )
  const usedContracted = titles.length === 0 || titles.every((t) => t.days < 30)
  const pct = usedContracted
    ? contracted
      ? contracted / 100
      : null
    : cdi > 0 && avg > 0
      ? pctOfCdi(rendimento, avg, cdi)
      : null
  return {
    rendimento: roundCents(rendimento),
    averageBalance: roundCents(avg),
    cdi,
    pctOfCdi: pct,
    contractedPct: contracted || null,
    usedContracted,
    from,
    to,
    businessDays: days.length,
  }
}

export function irBands(titles: TitledPosition[]) {
  const bands = [
    { label: "Até 180 dias", rate: "22,5%", gross: 0 },
    { label: "181 a 360 dias", rate: "20%", gross: 0 },
    { label: "361 a 720 dias", rate: "17,5%", gross: 0 },
    { label: "Mais de 720 dias", rate: "15%", gross: 0 },
  ]
  for (const t of titles) {
    const label = irBandLabel(t.days)
    const band = bands.find((b) => b.label === label)
    if (band) band.gross = roundCents(band.gross + t.gross)
  }
  return bands
}
