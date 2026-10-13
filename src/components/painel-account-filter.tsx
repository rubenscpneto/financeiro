"use client"

import { useRouter, useSearchParams } from "next/navigation"
import type { Account } from "@/lib/types"
import { dsControlClass } from "@/components/design/primitives"

export function PainelAccountFilter({ accounts }: { accounts: Account[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const current = params.get("account_id") ?? ""

  return (
    <div>
      <label className="mb-1 block text-sm text-ds-muted">Conta</label>
      <select
        className={dsControlClass}
        value={current}
        onChange={(e) => {
          const q = new URLSearchParams(params.toString())
          if (e.target.value) q.set("account_id", e.target.value)
          else q.delete("account_id")
          const qs = q.toString()
          router.push(qs ? `/painel?${qs}` : "/painel")
        }}
      >
        <option value="">Todas</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.institution ? ` (${a.institution})` : ""}
          </option>
        ))}
      </select>
    </div>
  )
}
