import { randomBytes } from "node:crypto"
import { blindIndex, deriveBlindIndexKey } from "./blind-index"
import { aadBytes, decryptAesGcm, encryptAesGcm, isEnvelope } from "./envelope"

const DEK_KEY_ID = "1"

export class UserCrypto {
  readonly bidxKey: Buffer

  constructor(
    readonly userId: string,
    readonly dek: Buffer,
    readonly keyId: string = DEK_KEY_ID,
    bidxKey?: Buffer
  ) {
    this.bidxKey = bidxKey ?? deriveBlindIndexKey(dek)
  }

  encrypt(column: string, plaintext: string): string {
    return encryptAesGcm({
      key: this.dek,
      plaintext: Buffer.from(plaintext, "utf8"),
      aad: aadBytes(this.userId, column),
      keyId: this.keyId,
    })
  }

  decrypt(column: string, envelope: string): string {
    return decryptAesGcm({
      key: this.dek,
      envelope,
      aad: aadBytes(this.userId, column),
    }).toString("utf8")
  }

  encryptOpt(
    column: string,
    value: string | null | undefined
  ): string | null {
    if (value == null || value === "") return value ?? null
    return this.encrypt(column, value)
  }

  /** Decrypt ciphertext; pass through leftover plaintext (migration). */
  decryptFlex(
    column: string,
    value: string | null | undefined
  ): string | null {
    if (value == null) return null
    if (isEnvelope(value)) return this.decrypt(column, value)
    return value
  }

  encryptNum(column: string, value: number | string): string {
    return this.encrypt(column, String(value))
  }

  encryptNumOpt(
    column: string,
    value: number | string | null | undefined
  ): string | null {
    if (value == null || value === "") return null
    return this.encryptNum(column, value)
  }

  decryptNum(column: string, value: string | number | null | undefined): number {
    const n = this.decryptNumOpt(column, value)
    if (n == null || !Number.isFinite(n)) return 0
    return n
  }

  decryptNumOpt(
    column: string,
    value: string | number | null | undefined
  ): number | null {
    if (value == null || value === "") return null
    if (typeof value === "number") return value
    const raw = isEnvelope(value) ? this.decrypt(column, value) : value
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }

  encryptBytes(column: string, data: Buffer): string {
    return encryptAesGcm({
      key: this.dek,
      plaintext: data,
      aad: aadBytes(this.userId, column),
      keyId: this.keyId,
    })
  }

  decryptBytes(column: string, envelope: string): Buffer {
    return decryptAesGcm({
      key: this.dek,
      envelope,
      aad: aadBytes(this.userId, column),
    })
  }

  blindIndex(plaintext: string): string {
    return blindIndex(this.bidxKey, plaintext)
  }

  blindIndexOpt(value: string | null | undefined): string | null {
    if (value == null || value === "") return null
    return this.blindIndex(value)
  }
}

export function generateDek(): Buffer {
  return randomBytes(32)
}
