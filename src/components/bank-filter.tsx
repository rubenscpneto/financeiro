"use client"

import { useRouter, useSearchParams } from "next/navigation"
import type { BankGroup } from "@/lib/banks"
import { dsControlClass } from "@/components/design/primitives"

export function BankFilter({
  banks,
  pathname,
}: {
  banks: BankGroup[]
  pathname: string
}) {
  const router = useRouter()
  const params = useSearchParams()
  const current = params.get("bank") ?? ""

  return (
    <label className="flex min-w-0 flex-[1_1_10rem] flex-col gap-1 text-sm text-ds-muted">
      Banco
      <select
        className={`${dsControlClass} w-full min-w-0 max-w-full`}
        value={current}
        name="bank"
        onChange={(e) => {
          const q = new URLSearchParams(params.toString())
          q.delete("account_id")
          if (e.target.value) q.set("bank", e.target.value)
          else q.delete("bank")
          const qs = q.toString()
          router.push(qs ? `${pathname}?${qs}` : pathname)
        }}
      >
        <option value="">Todos</option>
        {banks.map((b) => (
          <option key={b.key} value={b.key}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  )
}
