import { createHmac, hkdfSync } from "node:crypto"

const SALT = Buffer.from("financeiro-bidx-v1", "utf8")
const INFO = Buffer.from("blind-index", "utf8")

export function deriveBlindIndexKey(dek: Buffer): Buffer {
  return Buffer.from(hkdfSync("sha256", dek, SALT, INFO, 32))
}

export function blindIndex(key: Buffer, plaintext: string): string {
  return createHmac("sha256", key).update(plaintext, "utf8").digest("hex")
}
