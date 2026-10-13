export const SP_TZ = "America/Sao_Paulo"

export function todayYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
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
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: style,
    year: "numeric",
    timeZone: SP_TZ,
  }).format(calendarDate(`${yearMonth}-01`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function cnSignClass(amount: number) {
  if (amount > 0) return "text-emerald-600 dark:text-emerald-400"
  if (amount < 0) return "text-red-600 dark:text-red-400"
  return "text-muted-foreground"
}
