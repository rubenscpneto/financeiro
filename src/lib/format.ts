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

export function currentYearMonth(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
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

export function cnSignClass(amount: number) {
  if (amount > 0) return "text-emerald-600 dark:text-emerald-400"
  if (amount < 0) return "text-red-600 dark:text-red-400"
  return "text-muted-foreground"
}
