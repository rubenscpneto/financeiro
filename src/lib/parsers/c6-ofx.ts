import { makeHash } from './normalize'
import type { ParseResult, ParsedTransaction } from './types'

export function parseC6Ofx(content: string): ParseResult {
  const warnings: string[] = []
  const transactions: ParsedTransaction[] = []
  const blocks = content.match(/<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi) ?? []

  for (const [index, block] of blocks.entries()) {
    try {
      const postedAt = getTag(block, 'DTPOSTED')
      const amountText = getTag(block, 'TRNAMT')
      const fitId = getTag(block, 'FITID')
      const description = getTag(block, 'MEMO') || getTag(block, 'NAME')
      if (!postedAt || !amountText || !description) throw new Error('Campos OFX obrigatórios ausentes')

      const date = parseOfxDate(postedAt)
      const amount = Number(amountText.replace(',', '.'))
      if (!Number.isFinite(amount)) throw new Error(`Valor OFX inválido: ${amountText}`)

      transactions.push({
        date,
        description: description.replace(/\s+/g, ' ').trim(),
        amount,
        isTransfer: /pix|ted|transfer[êe]ncia/i.test(description),
        externalHash: makeHash('c6-ofx', fitId, date, description, amount),
        confidence: 'high',
      })
    } catch (error) {
      warnings.push(`Transação OFX ${index + 1} ignorada: ${errorMessage(error)}`)
    }
  }

  if (blocks.length === 0) warnings.push('Nenhuma transação OFX encontrada.')
  return {
    transactions,
    positions: [],
    movements: [],
    meta: { parser: 'c6-ofx', confidence: 'high', warnings },
  }
}

function getTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'))
  return match?.[1]?.trim() || null
}

function parseOfxDate(value: string): string {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!match) throw new Error(`Data OFX inválida: ${value}`)
  return `${match[1]}-${match[2]}-${match[3]}`
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'erro desconhecido'
}
