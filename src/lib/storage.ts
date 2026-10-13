import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

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

/** Stores a statement and returns the relative path `${userId}/${importId}/${fileName}`. */
export async function saveStatementFile(
  userId: string,
  importId: string,
  fileName: string,
  content: Buffer
) {
  const safeName = sanitizeFileName(fileName)
  const relative = path.posix.join(userId, importId, safeName)
  const abs = resolveUnderStorage(relative)
  await mkdir(path.dirname(abs), { recursive: true })
  await writeFile(abs, content)
  return relative
}
