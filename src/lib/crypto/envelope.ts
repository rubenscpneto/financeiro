import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto"

const VERSION = "v1"
const NONCE_BYTES = 12
const AUTH_TAG_BYTES = 16
const ALGO = "aes-256-gcm"

const ENVELOPE_RE =
  /^v1:[A-Za-z0-9._-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/

export function isEnvelope(value: string | null | undefined): boolean {
  if (!value) return false
  return ENVELOPE_RE.test(value)
}

export function aadBytes(userId: string, column: string): Buffer {
  return Buffer.from(`${userId}:${column}`, "utf8")
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url")
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, "base64url")
}

export function encryptAesGcm(params: {
  key: Buffer
  plaintext: Buffer
  aad: Buffer
  keyId: string
}): string {
  if (params.key.length !== 32) {
    throw new Error("AES-256-GCM key must be 32 bytes")
  }
  if (!/^[A-Za-z0-9._-]+$/.test(params.keyId)) {
    throw new Error("keyId must be URL-safe")
  }
  const nonce = randomBytes(NONCE_BYTES)
  const cipher = createCipheriv(ALGO, params.key, nonce, {
    authTagLength: AUTH_TAG_BYTES,
  })
  cipher.setAAD(params.aad, { plaintextLength: params.plaintext.length })
  const ct = Buffer.concat([cipher.update(params.plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    VERSION,
    params.keyId,
    b64url(nonce),
    b64url(ct),
    b64url(tag),
  ].join(":")
}

export function decryptAesGcm(params: {
  key: Buffer
  envelope: string
  aad: Buffer
}): Buffer {
  if (!isEnvelope(params.envelope)) {
    throw new Error("Invalid ciphertext envelope")
  }
  const parts = params.envelope.split(":")
  const nonce = fromB64url(parts[2]!)
  const ct = fromB64url(parts[3]!)
  const tag = fromB64url(parts[4]!)
  if (nonce.length !== NONCE_BYTES) {
    throw new Error("Invalid nonce length")
  }
  if (tag.length !== AUTH_TAG_BYTES) {
    throw new Error("Invalid auth tag length")
  }
  const decipher = createDecipheriv(ALGO, params.key, nonce, {
    authTagLength: AUTH_TAG_BYTES,
  })
  decipher.setAAD(params.aad, { plaintextLength: ct.length })
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()])
}
