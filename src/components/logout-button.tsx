"use client"

import { useState, type ReactNode } from "react"
import { logoutAction } from "@/lib/actions/auth"
import { cn } from "@/lib/utils"

export function LogoutButton({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const [pending, setPending] = useState(false)

  async function onLogout() {
    if (pending) return
    setPending(true)
    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    } catch {
      try {
        await logoutAction()
      } catch {
        /* redirect() throws; hard-nav below */
      }
    }
    window.location.assign("/auth/login?logout=1")
  }

  return (
    <button
      type="button"
      className={cn(className)}
      disabled={pending}
      onClick={onLogout}
    >
      {children}
    </button>
  )
}
