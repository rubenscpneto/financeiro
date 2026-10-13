import type { UserCrypto } from "./codec"

export function encAccount(
  c: UserCrypto,
  row: {
    name: string
    institution: string
    last4: string | null
    pluggy_account_id?: string | null
  }
) {
  return {
    name: c.encrypt("name", row.name),
    institution: c.encrypt("institution", row.institution),
    last4: c.encryptOpt("last4", row.last4),
    pluggy_account_id: c.encryptOpt("pluggy_account_id", row.pluggy_account_id),
    pluggy_account_id_bidx: c.blindIndexOpt(row.pluggy_account_id ?? null),
  }
}

export function decAccount<T extends {
  name: string
  institution: string
  last4: string | null
  pluggy_account_id?: string | null
}>(c: UserCrypto, row: T): T {
  return {
    ...row,
    name: c.decryptFlex("name", row.name) ?? row.name,
    institution: c.decryptFlex("institution", row.institution) ?? row.institution,
    last4: c.decryptFlex("last4", row.last4),
    pluggy_account_id: c.decryptFlex(
      "pluggy_account_id",
      row.pluggy_account_id ?? null
    ),
  }
}

export function encTransaction(
  c: UserCrypto,
  row: {
    description: string
    amount: number | string
    merchant?: string | null
    installment?: string | null
    notes?: string | null
    source_category?: string | null
    external_hash: string
  }
) {
  return {
    description: c.encrypt("description", row.description),
    amount: c.encryptNum("amount", row.amount),
    merchant: c.encryptOpt("merchant", row.merchant),
    installment: c.encryptOpt("installment", row.installment),
    notes: c.encryptOpt("notes", row.notes),
    source_category: c.encryptOpt("source_category", row.source_category),
    external_hash: c.blindIndex(row.external_hash),
  }
}

export function decTransaction<T extends {
  description: string
  amount: string | number
  merchant?: string | null
  installment?: string | null
  notes?: string | null
  source_category?: string | null
}>(c: UserCrypto, row: T): T & { amount: number } {
  return {
    ...row,
    description: c.decryptFlex("description", row.description) ?? "",
    amount: c.decryptNum("amount", row.amount),
    merchant: c.decryptFlex("merchant", row.merchant),
    installment: c.decryptFlex("installment", row.installment),
    notes: c.decryptFlex("notes", row.notes),
    source_category: c.decryptFlex("source_category", row.source_category),
  }
}

export function encPosition(
  c: UserCrypto,
  row: {
    ticker?: string | null
    asset_name: string
    quantity: number | string
    avg_price: number | string
    current_price: number | string
    rate?: number | string | null
    rate_type?: string | null
    amount_original?: number | string | null
    amount_withdrawal?: number | string | null
    external_hash: string
  }
) {
  return {
    ticker: c.encryptOpt("ticker", row.ticker),
    asset_name: c.encrypt("asset_name", row.asset_name),
    quantity: c.encryptNum("quantity", row.quantity),
    avg_price: c.encryptNum("avg_price", row.avg_price),
    current_price: c.encryptNum("current_price", row.current_price),
    rate: c.encryptNumOpt("rate", row.rate),
    rate_type: c.encryptOpt("rate_type", row.rate_type),
    amount_original: c.encryptNumOpt("amount_original", row.amount_original),
    amount_withdrawal: c.encryptNumOpt(
      "amount_withdrawal",
      row.amount_withdrawal
    ),
    external_hash: c.blindIndex(row.external_hash),
  }
}

export function decPosition<T extends {
  ticker?: string | null
  asset_name: string
  quantity: string | number
  avg_price: string | number
  current_price: string | number
  rate?: string | number | null
  rate_type?: string | null
  amount_original?: string | number | null
  amount_withdrawal?: string | number | null
}>(c: UserCrypto, row: T): T & {
  quantity: number
  avg_price: number
  current_price: number
  rate: number | null
  amount_original: number | null
  amount_withdrawal: number | null
} {
  return {
    ...row,
    ticker: c.decryptFlex("ticker", row.ticker),
    asset_name: c.decryptFlex("asset_name", row.asset_name) ?? "",
    quantity: c.decryptNum("quantity", row.quantity),
    avg_price: c.decryptNum("avg_price", row.avg_price),
    current_price: c.decryptNum("current_price", row.current_price),
    rate: c.decryptNumOpt("rate", row.rate),
    rate_type: c.decryptFlex("rate_type", row.rate_type),
    amount_original: c.decryptNumOpt("amount_original", row.amount_original),
    amount_withdrawal: c.decryptNumOpt(
      "amount_withdrawal",
      row.amount_withdrawal
    ),
  }
}

export function encMovement(
  c: UserCrypto,
  row: {
    description?: string | null
    amount: number | string
    external_hash: string
  }
) {
  return {
    description: c.encryptOpt("description", row.description),
    amount: c.encryptNum("amount", row.amount),
    external_hash: c.blindIndex(row.external_hash),
  }
}

export function decMovement<T extends {
  description?: string | null
  amount: string | number
}>(c: UserCrypto, row: T): T & { amount: number } {
  return {
    ...row,
    description: c.decryptFlex("description", row.description),
    amount: c.decryptNum("amount", row.amount),
  }
}
