import { roundCents } from "./money-math.ts"

export const OPEN_FINANCE_CONNECTED = "Conectado"
export const OPEN_FINANCE_RECONNECT = "Reconectar"

export const EXTRATO_SUMMARY_NOTE =
  "Estornos e cashback diminuem o gasto. Ficam de fora o pagamento da fatura, as aplicações e resgates no CDB e as transferências entre suas contas. Empréstimos vão para \u201ca receber\u201d."

export function openFinanceCopy({
  hasConnection,
}: {
  hasConnection: boolean
  status?: string | null
  executionStatus?: string | null
}): {
  statusLabel: string | null
  action: string
  detail: null
} {
  return {
    statusLabel: hasConnection ? OPEN_FINANCE_CONNECTED : null,
    action: OPEN_FINANCE_RECONNECT,
    detail: null,
  }
}

function asDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null
  }
  const iso = value.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T12:00:00`)
  }
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d : null
}

function monthsBetween(from: Date, to: Date) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

export function goalMonthlyPace(input: {
  current: number
  target: number
  deadline: string | null
  createdAt: string | Date | null
  asOf?: Date
}): { savedPerMonth: number; requiredPerMonth: number } {
  const asOf = input.asOf ?? new Date()
  const falta = Math.max(0, input.target - input.current)
  const due = input.deadline ? asDate(input.deadline.slice(0, 10)) : null
  const left = due ? monthsBetween(asOf, due) : 0
  const required = left > 0 ? falta / left : falta
  const created = asDate(input.createdAt)
  const elapsed = created ? monthsBetween(created, asOf) : 0
  const saved = elapsed > 0 ? input.current / elapsed : input.current
  return {
    savedPerMonth: roundCents(saved),
    requiredPerMonth: roundCents(required),
  }
}

export function goalPaceCopy(
  savedPerMonth: number,
  requiredPerMonth: number,
  money: (n: number) => string
): string {
  const saved = roundCents(savedPerMonth)
  const need = roundCents(requiredPerMonth)
  if (saved === need) {
    return `Você guarda ${money(saved)} por mês e está no ritmo certo pra chegar no prazo`
  }
  return `Você guarda ${money(saved)} por mês. Pra chegar no prazo, precisa guardar ${money(need)}.`
}
