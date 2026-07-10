import { createHash } from 'node:crypto'

export function parseBrDate(value: string): string {
  const input = value.trim()
  const brMatch = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input
  }

  throw new Error(`Unsupported date format: ${value}`)
}

export function parseBrMoney(value: string | number): number {
  if (typeof value === 'number') return value

  let normalized = value
    .trim()
    .replace(/\u00a0/g, '')
    .replace(/[R$US$\s]/gi, '')
    .replace(/\((.*)\)/, '-$1')

  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.')
  }

  const amount = Number(normalized)
  if (!Number.isFinite(amount)) {
    throw new Error(`Unsupported money format: ${value}`)
  }

  return amount
}

export function makeHash(...parts: (string | number | null | undefined)[]): string {
  return createHash('sha256')
    .update(parts.map((part) => String(part ?? '')).join('|'))
    .digest('hex')
    .slice(0, 40)
}

export function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === delimiter && !quoted) {
      values.push(value.trim())
      value = ''
    } else {
      value += char
    }
  }

  values.push(value.trim())
  return values
}

export function detectDelimiter(headerLine: string): ';' | ',' {
  let commas = 0
  let semicolons = 0
  let quoted = false

  for (let index = 0; index < headerLine.length; index += 1) {
    const char = headerLine[index]
    if (char === '"') {
      if (quoted && headerLine[index + 1] === '"') index += 1
      else quoted = !quoted
    } else if (!quoted && char === ';') {
      semicolons += 1
    } else if (!quoted && char === ',') {
      commas += 1
    }
  }

  return semicolons >= commas ? ';' : ','
}
