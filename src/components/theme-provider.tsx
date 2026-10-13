"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type Theme = "light" | "dark" | "system"

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "light" | "dark"
}>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
})

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme")
    if (stored === "light" || stored === "dark" || stored === "system") return stored
  } catch {
    /* ignore */
  }
  return "system"
}

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.classList.toggle("dark", dark)
  document.documentElement.style.colorScheme = dark ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = readTheme()
      setThemeState(next)
      applyTheme(next)
      setHydrated(true)
    }, 0)
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onScheme = () => {
      if (readTheme() === "system") applyTheme("system")
    }
    mq.addEventListener("change", onScheme)
    return () => {
      window.clearTimeout(id)
      mq.removeEventListener("change", onScheme)
    }
  }, [])

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem("theme", next)
    } catch {
      /* ignore */
    }
    setThemeState(next)
    applyTheme(next)
  }, [])

  const resolvedTheme = useMemo(() => {
    if (!hydrated) return "light" as const
    if (theme === "dark") return "dark" as const
    if (theme === "light") return "light" as const
    return document.documentElement.classList.contains("dark") ? "dark" : "light"
  }, [hydrated, theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
