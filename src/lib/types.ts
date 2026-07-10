export type AccountType = "checking" | "credit_card" | "investment"
export type CategoryKind = "income" | "expense" | "transfer"
export type AssetClass =
  | "renda_fixa"
  | "acao"
  | "fii"
  | "etf"
  | "cripto"
  | "outro"

export type Profile = {
  id: string
  nome: string | null
  locale: string
  timezone: string
}

export type Account = {
  id: string
  user_id: string
  name: string
  type: AccountType
  institution: string
  last4: string | null
  currency: string
  is_active: boolean
}

export type Category = {
  id: string
  user_id: string
  name: string
  kind: CategoryKind
  color: string | null
  is_system: boolean
}

export type CategoryRule = {
  id: string
  user_id: string
  match_pattern: string
  category_id: string
  priority: number
  account_type: AccountType | null
}

export type Transaction = {
  id: string
  user_id: string
  account_id: string
  import_id: string | null
  date: string
  description: string
  amount: number
  category_id: string | null
  merchant: string | null
  installment: string | null
  external_hash: string
  source_category: string | null
  notes: string | null
  is_transfer: boolean
}

export type Budget = {
  id: string
  user_id: string
  category_id: string
  year_month: string
  limit_amount: number
}

export type Goal = {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  color: string | null
  is_archived: boolean
}

export type InvestmentPosition = {
  id: string
  user_id: string
  account_id: string
  ticker: string | null
  asset_name: string
  asset_class: AssetClass
  quantity: number
  avg_price: number
  current_price: number
  as_of: string
  external_hash: string
}

export type InvestmentMovement = {
  id: string
  user_id: string
  account_id: string
  position_id: string | null
  import_id: string | null
  date: string
  type: "aporte" | "resgate" | "provento" | "outro"
  description: string | null
  amount: number
  external_hash: string
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Conta corrente",
  credit_card: "Cartão de crédito",
  investment: "Investimentos",
}

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  renda_fixa: "Renda fixa",
  acao: "Ações",
  fii: "FIIs",
  etf: "ETFs",
  cripto: "Cripto",
  outro: "Outros",
}
