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
const CHANGE_EVENT = "financeiro-hide-values-change"

function readHidden() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "0") return false
    if (stored === "1") return true
  } catch {
    /* ignore */
  }
  return true
}

function writeHidden(next: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

const HideValuesContext = createContext<{
  hidden: boolean
  toggle: () => void
  setHidden: (next: boolean) => void
}>({
  hidden: true,
  toggle: () => {},
  setHidden: () => {},
})

export function HideValuesProvider({ children }: { children: ReactNode }) {
  const [hidden, setHiddenState] = useState(true)

  useEffect(() => {
    const onChange = () => setHiddenState(readHidden())
    window.addEventListener("storage", onChange)
    window.addEventListener(CHANGE_EVENT, onChange)
    window.dispatchEvent(new Event(CHANGE_EVENT))
    return () => {
      window.removeEventListener("storage", onChange)
      window.removeEventListener(CHANGE_EVENT, onChange)
    }
  }, [])

  const setHidden = useCallback((next: boolean) => {
    writeHidden(next)
  }, [])

  const toggle = useCallback(() => {
    writeHidden(!readHidden())
  }, [])

  return (
    <HideValuesContext.Provider value={{ hidden, toggle, setHidden }}>
      {children}
    </HideValuesContext.Provider>
  )
}

export function useHideValues() {
  return useContext(HideValuesContext)
}
