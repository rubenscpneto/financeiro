import { detectDelimiter, makeHash, parseBrDate, parseBrMoney, splitCsvLine } from './normalize'
import type { ParseResult, ParsedTransaction } from './types'

const normalizeHeader = (value: string) =>
  value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const findColumn = (headers: string[], patterns: string[]) =>
  headers.findIndex((header) => patterns.some((pattern) => header.includes(pattern)))

export function parseC6CheckingCsv(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  const warnings: string[] = []
  if (lines.length === 0) return emptyResult(warnings)

  const delimiter = detectDelimiter(lines[0])
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader)
  const dateIndex = findColumn(headers, ['data', 'date'])
  const descriptionIndex = findColumn(headers, ['descricao', 'historico', 'title'])
  const amountIndex = findColumn(headers, ['valor', 'amount', 'value'])
  const typeIndex = findColumn(headers, ['tipo', 'type', 'natureza'])

  if ([dateIndex, descriptionIndex, amountIndex].some((index) => index < 0)) {
    warnings.push('Não foi possível identificar data, descrição e valor no extrato.')
    return emptyResult(warnings)
  }

  const rawRows = lines.slice(1).map((line) => splitCsvLine(line, delimiter))
  const amountsAreAbsolute = rawRows.every((fields) => {
    const raw = fields[amountIndex]?.trim() ?? ''
    return raw === '' || !/^-|\(.*\)$/.test(raw)
  })

  const transactions: ParsedTransaction[] = []
  for (const [lineNumber, fields] of rawRows.entries()) {
    try {
      const date = parseBrDate(fields[dateIndex] ?? '')
      const description = fields[descriptionIndex]?.trim()
      if (!description) throw new Error('Descrição vazia')

      let amount = parseBrMoney(fields[amountIndex] ?? '')
      const type = fields[typeIndex]?.trim().toLowerCase() ?? ''
      if (amountsAreAbsolute && type) {
        if (/debito|débito|saida|saída|despesa/.test(type)) amount = -Math.abs(amount)
        if (/credito|crédito|entrada|receita/.test(type)) amount = Math.abs(amount)
      }

      transactions.push({
        date,
        description,
        amount,
        isTransfer: /pix|ted|transfer[êe]ncia/i.test(description),
        externalHash: makeHash('c6-checking', date, description, amount),
        confidence: 'high',
      })
    } catch (error) {
      warnings.push(`Linha ${lineNumber + 2} ignorada: ${errorMessage(error)}`)
    }
  }

  return {
    transactions,
    positions: [],
    movements: [],
    meta: { parser: 'c6-checking-csv', confidence: 'high', warnings },
  }
}

function emptyResult(warnings: string[]): ParseResult {
  return {
    transactions: [],
    positions: [],
    movements: [],
    meta: { parser: 'c6-checking-csv', confidence: 'high', warnings },
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'erro desconhecido'
}
