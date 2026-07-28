export type AccountSourceType = 'checking' | 'credit_card' | 'investment'
export type AssetClass = 'renda_fixa' | 'acao' | 'fii' | 'etf' | 'cripto' | 'outro'

export type ParsedTransaction = {
  date: string
  description: string
  amount: number
  merchant?: string
  installment?: string | null
  sourceCategory?: string | null
  isTransfer?: boolean
  externalHash: string
  confidence?: 'high' | 'medium' | 'low'
}

export type ParsedPosition = {
  ticker?: string | null
  assetName: string
  assetClass: AssetClass
  quantity: number
  avgPrice: number
  currentPrice: number
  asOf: string
  purchaseDate?: string | null
  rate?: number | null
  rateType?: string | null
  amountOriginal?: number | null
  amountWithdrawal?: number | null
  externalHash: string
}

export type ParsedMovement = {
  date: string
  type: 'aporte' | 'resgate' | 'provento' | 'outro'
  description?: string
  amount: number
  externalHash: string
}

export type ParseResult = {
  transactions: ParsedTransaction[]
  positions: ParsedPosition[]
  movements: ParsedMovement[]
  meta: {
    parser: string
    confidence: 'high' | 'medium' | 'low'
    warnings: string[]
  }
}
