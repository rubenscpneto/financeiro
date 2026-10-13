"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { BankGroup } from "@/lib/banks"
import {
  BANK_FILTER_COOKIE,
  parseBankCookie,
  serializeBankCookie,
} from "@/lib/banks"
import { cn } from "@/lib/utils"

function readDocumentCookie(): string | null {
  if (typeof document === "undefined") return null
  const parts = document.cookie.split("; ")
  const row = parts.find((p) => p.startsWith(`${BANK_FILTER_COOKIE}=`))
  if (!row) return null
  return parseBankCookie(decodeURIComponent(row.slice(BANK_FILTER_COOKIE.length + 1)))
}

function ChipButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm whitespace-nowrap",
        active
          ? "bg-ds-accent font-semibold text-ds-on-btn"
          : "border border-ds-border bg-ds-surface font-medium text-ds-muted"
      )}
    >
      {children}
    </button>
  )
}

export function BankFilter({
  banks,
}: {
  banks: Pick<BankGroup, "key" | "name">[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const current = params.get("bank") ?? ""
  const restored = useRef(false)
  const hidden = banks.length < 2

  useEffect(() => {
    if (hidden || restored.current) return
    restored.current = true
    const urlBank = params.get("bank")
    if (urlBank) {
      document.cookie = serializeBankCookie(urlBank)
      return
    }
    const stored = readDocumentCookie()
    if (stored && banks.some((b) => b.key === stored)) {
      const q = new URLSearchParams(params.toString())
      q.set("bank", stored)
      const qs = q.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    }
  }, [hidden, banks, params, pathname, router])

  if (hidden) return null

  function go(next: string | null) {
    const q = new URLSearchParams(params.toString())
    q.delete("account_id")
    if (next) q.set("bank", next)
    else q.delete("bank")
    document.cookie = serializeBankCookie(next)
    const qs = q.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div
      role="group"
      aria-label="Banco"
      className="inline-flex min-w-0 max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto"
    >
      <ChipButton active={!current} onClick={() => go(null)}>
        Todos
      </ChipButton>
      {banks.map((b) => {
        const on = current === b.key
        return (
          <ChipButton
            key={b.key}
            active={on}
            onClick={() => go(on ? null : b.key)}
          >
            {b.name}
            {on ? <span className="ml-1" aria-hidden>×</span> : null}
          </ChipButton>
        )
      })}
    </div>
  )
}
