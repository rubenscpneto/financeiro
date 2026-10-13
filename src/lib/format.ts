export const SP_TZ = "America/Sao_Paulo"

const PT_MONTHS_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const

const PT_MONTHS_SHORT = [
  "jan.",
  "fev.",
  "mar.",
  "abr.",
  "mai.",
  "jun.",
  "jul.",
  "ago.",
  "set.",
  "out.",
  "nov.",
  "dez.",
] as const

const PT_WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
] as const

export function todayYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/** Civil date in America/Sao_Paulo. Date-only `YYYY-MM-DD` is already the calendar day. */
export function calendarYmd(iso: string): string {
  const raw = (iso ?? "").trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw) && /(?:Z|[+-]\d{2}:\d{2})$/.test(raw)) {
    const d = new Date(raw)
    if (Number.isFinite(d.getTime())) return todayYmd(d)
  }
  return raw.slice(0, 10)
}

export function formatTodayLabel(date = new Date()) {
  const ymd = todayYmd(date)
  const [y, m, d] = ymd.split("-").map(Number)
  const weekday = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay()
  return `${PT_WEEKDAYS[weekday]}, ${d} de ${PT_MONTHS_LONG[m - 1]}`
}

export function extratoDayHeading(isoDate: string, today: string) {
  const day = isoDate.slice(0, 10)
  const [, m, d] = day.split("-").map(Number)
  const label = `${d} de ${PT_MONTHS_LONG[m - 1]}`.toUpperCase()
  return day === today ? `${label} · HOJE` : label
}

export function formatBRL(value: number) {
  const abs = Math.round(Math.abs(value) * 100)
  const whole = Math.floor(abs / 100)
  const cents = String(abs % 100).padStart(2, "0")
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  const sign = value < 0 ? "−" : ""
  return `${sign}R$ ${grouped},${cents}`
}

export function formatDateBR(isoDate: string) {
  const [y, m, d] = isoDate.split("-")
  if (!y || !m || !d) return isoDate
  return `${d}/${m}/${y}`
}

export function currentYearMonth(date?: Date) {
  if (!date) return todayYmd().slice(0, 7)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export function monthLookbackStart(yearMonth: string, months = 18) {
  return `${shiftYearMonth(yearMonth, -months)}-01`
}

export function monthBounds(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number)
  const start = `${y}-${String(m).padStart(2, "0")}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return { start, end }
}

export function shiftYearMonth(yearMonth: string, deltaMonths: number) {
  const [y, m] = yearMonth.split("-").map(Number)
  const d = new Date(y, m - 1 + deltaMonths, 1)
  return currentYearMonth(d)
}

export function isoToBrShort(isoDate: string) {
  const [y, m, d] = isoDate.split("-")
  if (!y || !m || !d) return isoDate
  return `${d}/${m}`
}

export function calendarDate(iso: string) {
  const day = iso.slice(0, 10)
  return new Date(`${day}T12:00:00.000-03:00`)
}

export function monthLabelPt(yearMonth: string, style: "long" | "short" = "long") {
  const [y, m] = yearMonth.split("-").map(Number)
  const months = style === "short" ? PT_MONTHS_SHORT : PT_MONTHS_LONG
  const name = months[(m || 1) - 1] ?? ""
  const label = `${name} de ${y}`
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function cnSignClass(amount: number) {
  if (amount > 0) return "text-emerald-600 dark:text-emerald-400"
  if (amount < 0) return "text-red-600 dark:text-red-400"
  return "text-muted-foreground"
}
