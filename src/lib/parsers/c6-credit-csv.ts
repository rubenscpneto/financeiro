import { detectDelimiter, makeHash, parseBrDate, parseBrMoney, splitCsvLine } from './normalize'
import type { ParseResult, ParsedTransaction } from './types'

const normalizeHeader = (value: string) =>
  value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

export function parseC6CreditCsv(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  const warnings: string[] = []
  if (lines.length === 0) {
    return emptyResult(warnings)
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader)
  const indexOf = (header: string) => headers.indexOf(normalizeHeader(header))
  const dateIndex = indexOf('Data de Compra')
  const categoryIndex = indexOf('Categoria')
  const descriptionIndex = indexOf('Descrição')
  const installmentIndex = indexOf('Parcela')
  const amountIndex = indexOf('Valor (em R$)')

  if ([dateIndex, descriptionIndex, amountIndex].some((index) => index < 0)) {
    warnings.push('Cabeçalhos obrigatórios da fatura C6 não encontrados.')
    return emptyResult(warnings)
  }

  const transactions: ParsedTransaction[] = []
  for (const [lineNumber, line] of lines.slice(1).entries()) {
    try {
      const fields = splitCsvLine(line, delimiter)
      const date = parseBrDate(fields[dateIndex] ?? '')
      const description = fields[descriptionIndex]?.trim()
      if (!description) throw new Error('Descrição vazia')

      const amount = -parseBrMoney(fields[amountIndex] ?? '')
      const installmentValue = fields[installmentIndex]?.trim()
      const installment = !installmentValue || /^única$/i.test(installmentValue) ? null : installmentValue
      const isTransfer = /inclusao de pagamento|pagamento/i.test(description)

      transactions.push({
        date,
        description,
        amount,
        installment,
        sourceCategory: fields[categoryIndex]?.trim() || null,
        isTransfer,
        externalHash: makeHash('c6-credit', date, description, amount, installment),
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
    meta: { parser: 'c6-credit-csv', confidence: 'high', warnings },
  }
}

function emptyResult(warnings: string[]): ParseResult {
  return {
    transactions: [],
    positions: [],
    movements: [],
    meta: { parser: 'c6-credit-csv', confidence: 'high', warnings },
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'erro desconhecido'
}
