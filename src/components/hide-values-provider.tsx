"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

const STORAGE_KEY = "financeiro-hide-values"

const HideValuesContext = createContext<{
  hidden: boolean
  toggle: () => void
}>({
  hidden: true,
  toggle: () => {},
})

export function HideValuesProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === "0") setHidden(false)
      if (stored === "1") setHidden(true)
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return (
    <HideValuesContext.Provider value={{ hidden, toggle }}>
      {children}
    </HideValuesContext.Provider>
  )
}

export function useHideValues() {
  return useContext(HideValuesContext)
}
