import { PDFParse } from 'pdf-parse'

import { makeHash, parseBrDate, parseBrMoney } from './normalize'
import type { AccountSourceType, ParseResult, ParsedTransaction } from './types'

const DATE_PATTERN = /\b(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/
const MONEY_PATTERN = /-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}|\d+\.\d{2})\b/g

export async function parseC6Pdf(
  buffer: Buffer,
  password?: string,
  sourceType: AccountSourceType = 'checking',
): Promise<ParseResult> {
  const warnings: string[] = []
  const parser = new PDFParse({ data: buffer, password })

  try {
    const { text } = await parser.getText({ lineEnforce: true, cellSeparator: ' ' })
    const transactions = scrapeTransactions(text, sourceType, warnings)
    if (transactions.length === 0) warnings.push('Nenhuma linha de transação reconhecida no PDF.')

    return {
      transactions,
      positions: [],
      movements: [],
      meta: { parser: 'c6-pdf', confidence: 'low', warnings },
    }
  } finally {
    await parser.destroy()
  }
}

function scrapeTransactions(
  text: string,
  sourceType: AccountSourceType,
  warnings: string[],
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const dateMatch = line.match(DATE_PATTERN)
    if (!dateMatch) continue

    const amounts = [...line.matchAll(MONEY_PATTERN)]
    const amountMatch = amounts.at(-1)
    if (!amountMatch) continue

    try {
      const date = parseBrDate(dateMatch[1])
      const rawAmount = amountMatch[0].replace(/\s/g, '')
      const parsedAmount = parseBrMoney(rawAmount)
      const amount = sourceType === 'credit_card' ? -parsedAmount : parsedAmount
      const description = line
        .replace(dateMatch[0], '')
        .replace(amountMatch[0], '')
        .replace(/\s+/g, ' ')
        .trim()

      if (!description) throw new Error('Descrição vazia')
      transactions.push({
        date,
        description,
        amount,
        isTransfer: /inclusao de pagamento|pagamento|pix|ted|transfer[êe]ncia/i.test(description),
        externalHash: makeHash('c6-pdf', sourceType, date, description, amount, index),
        confidence: 'low',
      })
    } catch (error) {
      warnings.push(`Linha PDF ${index + 1} ignorada: ${errorMessage(error)}`)
    }
  }

  return transactions
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'erro desconhecido'
}
