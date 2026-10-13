/** Hidden is the default. Only `hidden=0` reveals amounts. */
export function hideValuesFromSearchParam(hidden?: string): boolean {
  return hidden !== "0"
}

/** Same rule as the localStorage flag `financeiro-hide-values`. */
export function hiddenFromStorageValue(
  stored: string | null | undefined
): boolean {
  return stored !== "0"
}

/**
 * SSR and the consumer's first client paint must stay hidden so EyeButton /
 * AppMoney HTML matches. localStorage is applied only after that consumer hydrates.
 */
export function hiddenForHydration(opts: {
  stored: string | null | undefined
  hydrated: boolean
}): boolean {
  if (!opts.hydrated) return true
  return hiddenFromStorageValue(opts.stored)
}
