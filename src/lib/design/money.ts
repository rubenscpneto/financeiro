const MONEY = /[−+-]?R\$\s?\d[\d.]*(?:,\d+)?/g

function formatBRLNumber(value: number): string {
  const abs = Math.round(Math.abs(value) * 100)
  const whole = Math.floor(abs / 100)
  const cents = String(abs % 100).padStart(2, "0")
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `R$ ${grouped},${cents}`
}

export function formatBRLMasked(value: number, hidden: boolean): string {
  if (hidden) return "R$ ••••"
  return formatBRLNumber(value)
}

export function formatSignedBRL(value: number, hidden: boolean): string {
  if (hidden) return "R$ ••••"
  const abs = formatBRLNumber(Math.abs(value))
  if (value > 0) return `+${abs}`
  if (value < 0) return `−${abs}`
  return abs
}

export function maskMoneyInText(text: string, hidden: boolean): string {
  if (!hidden) return text
  return text.replace(MONEY, "R$ ••••")
}
