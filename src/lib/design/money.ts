const MONEY = /[−+-]?R\$\s?\d[\d.]*(?:,\d+)?/g

export function formatBRLMasked(value: number, hidden: boolean): string {
  if (hidden) return "R$ ••••"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatSignedBRL(value: number, hidden: boolean): string {
  if (hidden) return "R$ ••••"
  const abs = formatBRLMasked(Math.abs(value), false)
  if (value > 0) return `+${abs}`
  if (value < 0) return `−${abs}`
  return abs
}

export function maskMoneyInText(text: string, hidden: boolean): string {
  if (!hidden) return text
  return text.replace(MONEY, "R$ ••••")
}
