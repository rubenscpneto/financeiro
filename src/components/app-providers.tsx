"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "next-themes"
import { HideValuesProvider } from "@/components/hide-values-provider"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <HideValuesProvider>{children}</HideValuesProvider>
    </ThemeProvider>
  )
}
