import {
  BlobReader,
  TextWriter,
  ZipReader,
  Uint8ArrayWriter,
  configure,
} from '@zip.js/zip.js'

// Avoid hanging worker threads in Next.js / Node server actions
configure({ useWebWorkers: false })

export const PASSWORD_HINT =
  'Senha incorreta ou ausente (4 ou 6 primeiros dígitos do CPF)'

const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04])

export function isZipBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).equals(ZIP_SIGNATURE)
}

export function looksLikePlainTextCsv(text: string): boolean {
  const header = text.split(/\r?\n/, 1)[0] ?? ''
  if (!header.trim()) return false
  const sample = text.slice(0, 2048)
  let weird = 0
  for (let i = 0; i < sample.length; i += 1) {
    const code = sample.charCodeAt(i)
    if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      weird += 1
    }
  }
  if (weird > sample.length * 0.05) return false
  return /[;,]/.test(header) || /data|descricao|valor|fatura|historico/i.test(header)
}

export function isPasswordError(error: unknown): boolean {
  if (error instanceof Error && error.message === PASSWORD_HINT) return true
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /password|senha|PasswordException|Invalid password|encrypted|wrong password/i.test(
    message,
  )
}

type ZipEntryLike = {
  directory?: boolean
  filename: string
  encrypted?: boolean
  getData?: <T>(writer: T, options?: { password?: string }) => Promise<unknown>
}

async function openZipEntries(buffer: Buffer): Promise<{
  entries: ZipEntryLike[]
  close: () => Promise<void>
}> {
  const reader = new ZipReader(new BlobReader(new Blob([new Uint8Array(buffer)])))
  const entries = (await reader.getEntries()) as ZipEntryLike[]
  return {
    entries,
    close: () => reader.close(),
  }
}

async function readEntryText(
  entry: ZipEntryLike,
  password?: string,
): Promise<string> {
  if (!entry.getData) throw new Error('Entrada ZIP inválida')
  try {
    return (await entry.getData(new TextWriter(), password ? { password } : undefined)) as string
  } catch (error) {
    if (isPasswordError(error) || entry.encrypted) throw new Error(PASSWORD_HINT)
    throw error
  }
}

async function readEntryBytes(
  entry: ZipEntryLike,
  password?: string,
): Promise<Buffer> {
  if (!entry.getData) throw new Error('Entrada ZIP inválida')
  try {
    const bytes = (await entry.getData(
      new Uint8ArrayWriter(),
      password ? { password } : undefined,
    )) as Uint8Array
    return Buffer.from(bytes)
  } catch (error) {
    if (isPasswordError(error) || entry.encrypted) throw new Error(PASSWORD_HINT)
    throw error
  }
}

/**
 * If buffer is a (possibly password-protected) ZIP, extract the first CSV/TXT/OFX entry.
 * Returns null when buffer is not a ZIP.
 */
export async function unlockStatementText(
  buffer: Buffer,
  password?: string,
): Promise<{ text: string; entryName: string } | null> {
  if (!isZipBuffer(buffer)) return null

  const { entries, close } = await openZipEntries(buffer)
  try {
    const entry = entries.find(
      (item) =>
        !item.directory && /\.(csv|txt|ofx|ofc)$/i.test(item.filename),
    )
    if (!entry) return null
    const text = await readEntryText(entry, password)
    return { text, entryName: entry.filename }
  } finally {
    await close()
  }
}

/** Try unlock ZIP to raw bytes (e.g. nested PDF). */
export async function unlockStatementBuffer(
  buffer: Buffer,
  password?: string,
  preferExt?: RegExp,
): Promise<{ data: Buffer; entryName: string } | null> {
  if (!isZipBuffer(buffer)) return null

  const { entries, close } = await openZipEntries(buffer)
  try {
    const entry =
      entries.find((item) => !item.directory && preferExt?.test(item.filename)) ??
      entries.find((item) => !item.directory)
    if (!entry) return null
    const data = await readEntryBytes(entry, password)
    return { data, entryName: entry.filename }
  } finally {
    await close()
  }
}
