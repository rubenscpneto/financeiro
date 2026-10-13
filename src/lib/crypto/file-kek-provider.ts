import { readFileSync } from "node:fs"
import { aadBytes, decryptAesGcm, encryptAesGcm } from "./envelope"
import type { KeyProvider, WrappedDek } from "./key-provider"

function parseKekBytes(raw: Buffer): { key: Buffer; version: string } {
  const trimmed = Buffer.from(
    raw.toString("utf8").replace(/^\uFEFF/, "").trim(),
    "utf8"
  )
  const asText = trimmed.toString("utf8")

  const versioned = asText.match(/^v?(\d+)[:=\s]+([A-Za-z0-9+/=_-]+)\s*$/)
  if (versioned) {
    return { version: versioned[1]!, key: decodeKeyMaterial(versioned[2]!) }
  }

  if (raw.length === 32 && !isMostlyPrintable(raw)) {
    return { version: "1", key: Buffer.from(raw) }
  }

  return { version: "1", key: decodeKeyMaterial(asText) }
}

function isMostlyPrintable(buf: Buffer): boolean {
  let printable = 0
  for (const b of buf) {
    if (b === 10 || b === 13 || (b >= 32 && b <= 126)) printable += 1
  }
  return printable === buf.length
}

function decodeKeyMaterial(text: string): Buffer {
  const hex = text.replace(/\s+/g, "")
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    return Buffer.from(hex, "hex")
  }
  const b64 = Buffer.from(text, "base64")
  if (b64.length === 32) return b64
  throw new Error(
    "KEK file must be 32 raw bytes, 64 hex chars, or 32-byte base64"
  )
}

export class FileKekProvider implements KeyProvider {
  private readonly key: Buffer
  private readonly version: string

  constructor(filePath?: string) {
    const kekPath = filePath ?? process.env.KEK_FILE
    if (!kekPath) {
      throw new Error("KEK_FILE is not set")
    }
    const parsed = parseKekBytes(readFileSync(kekPath))
    this.key = parsed.key
    this.version = parsed.version
  }

  currentVersion(): string {
    return this.version
  }

  async wrapDek(dek: Buffer, userId: string): Promise<WrappedDek> {
    if (dek.length !== 32 && dek.length !== 64) {
      throw new Error("Wrapped payload must be 32 or 64 bytes")
    }
    const wrapped = encryptAesGcm({
      key: this.key,
      plaintext: dek,
      aad: aadBytes(userId, "dek"),
      keyId: this.version,
    })
    return { wrapped, kekVersion: this.version }
  }

  async unwrapDek(
    wrapped: string,
    kekVersion: string,
    userId: string
  ): Promise<Buffer> {
    if (kekVersion !== this.version) {
      throw new Error(
        `KEK version mismatch: ciphertext=${kekVersion} file=${this.version}`
      )
    }
    const dek = decryptAesGcm({
      key: this.key,
      envelope: wrapped,
      aad: aadBytes(userId, "dek"),
    })
    if (dek.length !== 32 && dek.length !== 64) {
      throw new Error("Unwrapped payload must be 32 or 64 bytes")
    }
    return dek
  }
}

export function createFileKekProvider(filePath?: string): FileKekProvider {
  return new FileKekProvider(filePath)
}
