"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { hiddenForHydration, hiddenFromStorageValue } from "@/lib/design/hide-values"

const STORAGE_KEY = "financeiro-hide-values"
const CHANGE_EVENT = "financeiro-hide-values-change"
const SERVER_HIDDEN = true

function readStoredFlag(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function readHidden() {
  return hiddenFromStorageValue(readStoredFlag())
}

function writeHidden(next: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  window.addEventListener(CHANGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener(CHANGE_EVENT, onStoreChange)
  }
}

function getServerSnapshot() {
  return SERVER_HIDDEN
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
  const storedHidden = useSyncExternalStore(
    subscribe,
    readHidden,
    getServerSnapshot
  )

  const setHidden = useCallback((next: boolean) => {
    writeHidden(next)
  }, [])

  const toggle = useCallback(() => {
    writeHidden(!readHidden())
  }, [])

  return (
    <HideValuesContext.Provider
      value={{ hidden: storedHidden, toggle, setHidden }}
    >
      {children}
    </HideValuesContext.Provider>
  )
}

function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    // After this consumer's hydration commit — never during the parent
    // layout's mount effect, which used to flip EyeButton before AppShell
    // (inside Suspense) hydrated against the SSR HTML.
    const id = window.setTimeout(() => setHydrated(true), 0)
    return () => window.clearTimeout(id)
  }, [])
  return hydrated
}

export function useHideValues() {
  const ctx = useContext(HideValuesContext)
  const hydrated = useHydrated()
  return {
    hidden: hiddenForHydration({
      stored: ctx.hidden ? "1" : "0",
      hydrated,
    }),
    toggle: ctx.toggle,
    setHidden: ctx.setHidden,
  }
}
