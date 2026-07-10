import { parseC6CheckingCsv } from './c6-checking-csv'
import { parseC6CreditCsv } from './c6-credit-csv'
import { parseC6InvestCsv } from './c6-invest-csv'
import { parseC6Ofx } from './c6-ofx'
import { parseC6Pdf } from './c6-pdf'
import {
  isPasswordError,
  isZipBuffer,
  looksLikePlainTextCsv,
  PASSWORD_HINT,
  unlockStatementBuffer,
  unlockStatementText,
} from './unlock'
import type { AccountSourceType, ParseResult } from './types'

export type ParseStatementInput = {
  content: string | Buffer
  fileName: string
  sourceType: AccountSourceType
  password?: string
}

export async function parseStatement({
  content,
  fileName,
  sourceType,
  password,
}: ParseStatementInput): Promise<ParseResult> {
  let buffer = typeof content === 'string' ? Buffer.from(content) : content
  let extension = fileName.toLowerCase().split('.').at(-1) ?? ''
  let workingName = fileName

  if (isZipBuffer(buffer) || extension === 'zip') {
    const textUnlock = await unlockStatementText(buffer, password).catch(
      (error: unknown) => {
        if (isPasswordError(error)) throw error
        return null
      },
    )
    if (textUnlock) {
      return parseCsvOrOfxText(textUnlock.text, sourceType, textUnlock.entryName)
    }

    const pdfUnlock = await unlockStatementBuffer(buffer, password, /\.pdf$/i)
    if (pdfUnlock) {
      buffer = pdfUnlock.data
      workingName = pdfUnlock.entryName
      extension = 'pdf'
    } else if (extension === 'zip') {
      throw new Error(
        password
          ? PASSWORD_HINT
          : 'ZIP sem CSV/PDF legível. Informe a senha (4 ou 6 primeiros dígitos do CPF).',
      )
    }
  }

  if (extension === 'pdf') {
    try {
      return await parseC6Pdf(buffer, password, sourceType)
    } catch (error) {
      if (isPasswordError(error)) throw new Error(PASSWORD_HINT)
      throw error
    }
  }

  const text = buffer.toString('utf-8')

  if (
    (extension === 'csv' || extension === 'txt') &&
    !looksLikePlainTextCsv(text)
  ) {
    if (!password) throw new Error(PASSWORD_HINT)
    const unlocked = await unlockStatementText(buffer, password)
    if (unlocked) {
      return parseCsvOrOfxText(unlocked.text, sourceType, unlocked.entryName)
    }
    throw new Error(PASSWORD_HINT)
  }

  return parseCsvOrOfxText(text, sourceType, workingName)
}

function parseCsvOrOfxText(
  text: string,
  sourceType: AccountSourceType,
  fileName: string,
): ParseResult {
  const extension = fileName.toLowerCase().split('.').at(-1) ?? ''
  if (extension === 'ofx' || extension === 'ofc') {
    return parseC6Ofx(text)
  }

  const header = text.split(/\r?\n/, 1)[0]?.toLowerCase() ?? ''
  const looksCredit =
    /fatura|valor \(em r\$\)|nome no cart[aã]o|data de compra/.test(header)
  const looksInvest =
    /ticker|ativo|quantidade|classe|preço|preco|posição|posicao/.test(header)
  const looksChecking =
    /historico|histórico|lançamento|lancamento|saldo|entrada|saída|saida/.test(
      header,
    )

  // Prefer header sniffing over form source_type when headers are clear
  if (looksCredit) return parseC6CreditCsv(text)
  if (looksInvest) return parseC6InvestCsv(text)
  if (looksChecking) return parseC6CheckingCsv(text)

  if (sourceType === 'credit_card') return parseC6CreditCsv(text)
  if (sourceType === 'investment') return parseC6InvestCsv(text)
  return parseC6CheckingCsv(text)
}
