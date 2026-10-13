import { FileKekProvider } from "./file-kek-provider"
import type { KeyProvider } from "./key-provider"

let cached: KeyProvider | undefined

/** Phase 0 default. Swap this factory to OpenBao Transit in Phase 1. */
export function getKeyProvider(): KeyProvider {
  if (!cached) {
    cached = new FileKekProvider()
  }
  return cached
}

export function resetKeyProviderCache(): void {
  cached = undefined
}
