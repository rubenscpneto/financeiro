import { formatBRLMasked } from "@/lib/design/money"
import { cn } from "@/lib/utils"

export function brl(
  value: number,
  hidden: boolean,
  opts?: { compact?: boolean; sign?: boolean }
): string {
  if (hidden) return "R$ ••••"
  const abs = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: opts?.compact ? 0 : 2,
    minimumFractionDigits: opts?.compact ? 0 : 2,
  }).format(Math.abs(value))
  if (!opts?.sign) return abs
  if (value > 0) return `+${abs}`
  if (value < 0) return `−${abs}`
  return abs
}

export function Money({
  value,
  hidden,
  compact,
  sign,
  className,
}: {
  value: number
  hidden: boolean
  compact?: boolean
  sign?: boolean
  className?: string
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      {brl(value, hidden, { compact, sign })}
    </span>
  )
}

export function VisibleBRL({
  value,
  hidden,
}: {
  value: number
  hidden: boolean
}) {
  return formatBRLMasked(value, hidden)
}
