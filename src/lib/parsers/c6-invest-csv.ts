import { detectDelimiter, makeHash, parseBrDate, parseBrMoney, splitCsvLine } from './normalize'
import type { AssetClass, ParseResult, ParsedPosition } from './types'

const normalizeHeader = (value: string) =>
  value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const findColumn = (headers: string[], patterns: string[]) =>
  headers.findIndex((header) => patterns.some((pattern) => header.includes(pattern)))

export function parseC6InvestCsv(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  const warnings: string[] = []
  if (lines.length === 0) return emptyResult(warnings)

  const delimiter = detectDelimiter(lines[0])
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader)
  const assetIndex = findColumn(headers, ['ativo', 'ticker', 'nome'])
  const quantityIndex = findColumn(headers, ['quantidade', 'qtd'])
  const priceIndex = findColumn(headers, ['preco', 'pu'])
  const valueIndex = findColumn(headers, ['valor'])
  const dateIndex = findColumn(headers, ['data', 'date'])

  if ([assetIndex, quantityIndex, dateIndex].some((index) => index < 0)) {
    warnings.push('Não foi possível identificar ativo, quantidade e data no arquivo de investimentos.')
    return emptyResult(warnings)
  }

  const positions: ParsedPosition[] = []
  for (const [lineNumber, line] of lines.slice(1).entries()) {
    try {
      const fields = splitCsvLine(line, delimiter)
      const assetName = fields[assetIndex]?.trim()
      if (!assetName) throw new Error('Ativo vazio')

      const quantity = parseBrMoney(fields[quantityIndex] ?? '')
      const reportedValue = valueIndex >= 0 ? parseBrMoney(fields[valueIndex] ?? '') : Number.NaN
      const reportedPrice = priceIndex >= 0 ? parseBrMoney(fields[priceIndex] ?? '') : Number.NaN
      const currentPrice = Number.isFinite(reportedPrice)
        ? reportedPrice
        : Number.isFinite(reportedValue) && quantity !== 0
          ? reportedValue / quantity
          : 0
      const ticker = /^[A-Z]{4}\d{1,2}(?:11)?$/i.test(assetName) ? assetName.toUpperCase() : null
      const asOf = parseBrDate(fields[dateIndex] ?? '')

      positions.push({
        ticker,
        assetName,
        assetClass: detectAssetClass(assetName),
        quantity,
        avgPrice: currentPrice,
        currentPrice,
        asOf,
        externalHash: makeHash('c6-invest', ticker, assetName, quantity, currentPrice, asOf),
      })
    } catch (error) {
      warnings.push(`Linha ${lineNumber + 2} ignorada: ${errorMessage(error)}`)
    }
  }

  return {
    transactions: [],
    positions,
    movements: [],
    meta: { parser: 'c6-invest-csv', confidence: 'high', warnings },
  }
}

export function detectAssetClass(asset: string): AssetClass {
  const value = asset.toUpperCase()
  if (/\b(CDB|LCI|LCA)\b/.test(value)) return 'renda_fixa'
  if (/\b(FII|[A-Z]{4}11)\b/.test(value)) return 'fii'
  if (/\b(ETF|[A-Z]{4}11B)\b/.test(value)) return 'etf'
  if (/\b(BTC|ETH|BITCOIN|ETHEREUM)\b/.test(value)) return 'cripto'
  if (/^[A-Z]{4}\d{1,2}$/i.test(asset)) return 'acao'
  return 'outro'
}

function emptyResult(warnings: string[]): ParseResult {
  return {
    transactions: [],
    positions: [],
    movements: [],
    meta: { parser: 'c6-invest-csv', confidence: 'high', warnings },
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'erro desconhecido'
}
