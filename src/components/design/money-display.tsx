import { formatBRLMasked, formatSignedBRL } from "@/lib/design/money"
import { cn } from "@/lib/utils"

export function brl(
  value: number,
  hidden: boolean,
  opts?: { sign?: boolean }
): string {
  return opts?.sign
    ? formatSignedBRL(value, hidden)
    : formatBRLMasked(value, hidden)
}

export function Money({
  value,
  hidden,
  sign,
  className,
}: {
  value: number
  hidden: boolean
  sign?: boolean
  className?: string
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      {brl(value, hidden, { sign })}
    </span>
  )
}
