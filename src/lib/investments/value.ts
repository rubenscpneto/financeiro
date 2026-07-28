/** Net current value: Pluggy amountWithdrawal preferred over qty * price. */
export function positionCurrentValue(p: {
  quantity: number | string | null
  current_price: number | string | null
  amount_withdrawal?: number | string | null
}): number {
  if (
    p.amount_withdrawal != null &&
    Number.isFinite(Number(p.amount_withdrawal))
  ) {
    return Number(p.amount_withdrawal)
  }
  return (Number(p.quantity) || 0) * (Number(p.current_price) || 0)
}

export function positionInvestedValue(p: {
  quantity: number | string | null
  avg_price: number | string | null
  amount_original?: number | string | null
}): number {
  if (
    p.amount_original != null &&
    Number.isFinite(Number(p.amount_original))
  ) {
    return Number(p.amount_original)
  }
  return (Number(p.quantity) || 0) * (Number(p.avg_price) || 0)
}

/** Format Pluggy rate + rateType as "102% CDI". */
export function formatRentabilidade(
  rate: number | null,
  rateType: string | null
): string | null {
  if (rate == null || !Number.isFinite(Number(rate))) return null
  const formatted = `${Number(rate)}%`
  return rateType ? `${formatted} ${rateType}` : formatted
}
