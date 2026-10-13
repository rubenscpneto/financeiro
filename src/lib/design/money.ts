const MONEY = /[−+-]?R\$\s?\d[\d.]*(?:,\d+)?/g

export function formatBRLMasked(value: number, hidden: boolean): string {
  if (hidden) return "R$ ••••"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function maskMoneyInText(text: string, hidden: boolean): string {
  if (!hidden) return text
  return text.replace(MONEY, "R$ ••••")
}
