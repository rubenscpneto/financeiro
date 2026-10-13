import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import type { UserCrypto } from "@/lib/crypto/codec"
import { isEnvelope } from "@/lib/crypto/envelope"

export function storageRoot() {
  return process.env.STORAGE_DIR ?? "/data/statements"
}

export function sanitizeFileName(fileName: string) {
  const base = path.basename(fileName).replace(/[\u0000]/g, "")
  if (!base || base === "." || base === "..") return "file"
  return base
}

function resolveUnderStorage(relativePath: string) {
  const root = path.resolve(storageRoot())
  const abs = path.resolve(root, relativePath)
  const prefix = root.endsWith(path.sep) ? root : root + path.sep
  if (abs !== root && !abs.startsWith(prefix)) {
    throw new Error("Invalid storage path")
  }
  return abs
}

const FILE_COLUMN = "statement_file"

/** Stores a statement encrypted at rest. Returns `${userId}/${importId}/${fileName}`. */
export async function saveStatementFile(
  userId: string,
  importId: string,
  fileName: string,
  content: Buffer,
  crypto: UserCrypto
) {
  if (crypto.userId !== userId) {
    throw new Error("Statement encrypt user mismatch")
  }
  const safeName = sanitizeFileName(fileName)
  const relative = path.posix.join(userId, importId, safeName)
  const abs = resolveUnderStorage(relative)
  await mkdir(path.dirname(abs), { recursive: true })
  const envelope = crypto.encryptBytes(FILE_COLUMN, content)
  await writeFile(abs, envelope, "utf8")
  return relative
}

export async function readStatementFile(
  relativePath: string,
  crypto: UserCrypto
): Promise<Buffer> {
  const abs = resolveUnderStorage(relativePath)
  const raw = await readFile(abs)
  const asText = raw.toString("utf8")
  if (isEnvelope(asText.trim())) {
    return crypto.decryptBytes(FILE_COLUMN, asText.trim())
  }
  return raw
}

/** Encrypt a plaintext statement file in place. Idempotent. */
export async function encryptStatementFileInPlace(
  relativePath: string,
  crypto: UserCrypto
): Promise<boolean> {
  const abs = resolveUnderStorage(relativePath)
  const raw = await readFile(abs)
  const asText = raw.toString("utf8").trim()
  if (isEnvelope(asText)) return false
  const envelope = crypto.encryptBytes(FILE_COLUMN, raw)
  const tmp = `${abs}.enc-tmp`
  await writeFile(tmp, envelope, "utf8")
  await rename(tmp, abs)
  return true
}
