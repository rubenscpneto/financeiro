"use client"

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
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

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  window.addEventListener(CHANGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener(CHANGE_EVENT, onStoreChange)
  }
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
  const hidden = useSyncExternalStore(subscribe, readHidden, () => true)

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
