"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { HideValuesProvider } from "@/components/hide-values-provider"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <HideValuesProvider>{children}</HideValuesProvider>
    </ThemeProvider>
  )
}
