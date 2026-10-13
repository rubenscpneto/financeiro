/**
 * Wraps/unwraps per-user DEKs. Phase 0: FileKekProvider (KEK_FILE).
 * Phase 1: swap in an OpenBao Transit implementation of this interface.
 */
export type WrappedDek = {
  wrapped: string
  kekVersion: string
}

export interface KeyProvider {
  currentVersion(): string
  wrapDek(dek: Buffer, userId: string): Promise<WrappedDek>
  unwrapDek(
    wrapped: string,
    kekVersion: string,
    userId: string
  ): Promise<Buffer>
}
