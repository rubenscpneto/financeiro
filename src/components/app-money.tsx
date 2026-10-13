"use client"

import { Money } from "@/components/design/money-display"
import { useHideValues } from "@/components/hide-values-provider"

export function AppMoney({
  value,
  sign,
  className,
}: {
  value: number
  sign?: boolean
  className?: string
}) {
  const { hidden } = useHideValues()
  return (
    <Money value={value} hidden={hidden} sign={sign} className={className} />
  )
}
