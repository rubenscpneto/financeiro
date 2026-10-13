import { makeHash } from "@/lib/parsers/normalize"
import type {
  AccountSourceType,
  AssetClass,
  ParsedMovement,
  ParsedPosition,
  ParsedTransaction,
} from "@/lib/parsers/types"
import type {
  PluggyAccount,
  PluggyInvestment,
  PluggyInvestmentTransaction,
  PluggyTransaction,
} from "./client"

export function mapAccountSourceType(
  account: PluggyAccount
): AccountSourceType | null {
  if (account.type === "CREDIT" || account.subtype === "CREDIT_CARD") {
    return "credit_card"
  }
  if (
    account.type === "BANK" &&
    (account.subtype === "CHECKING_ACCOUNT" ||
      account.subtype === "SAVINGS_ACCOUNT")
  ) {
    return "checking"
  }
  return null
}

/** Credit liability for Painel: positive number owed. */
export function mapBalanceForSnapshot(
  account: PluggyAccount,
  sourceType: AccountSourceType
): number {
  if (sourceType === "credit_card") {
    return Math.abs(Number(account.balance) || 0)
  }
  return Number(account.balance) || 0
}

function isTransferHeuristic(txn: PluggyTransaction): boolean {
  const method = txn.paymentData?.paymentMethod?.toUpperCase() ?? ""
  if (["PIX", "TED", "DOC", "TEV"].includes(method)) return true
  const cat = (txn.category ?? "").toLowerCase()
  if (cat.includes("transfer") || cat.includes("transferência")) return true
  const desc = txn.description.toLowerCase()
  return (
    desc.includes("pix") ||
    desc.includes("ted ") ||
    desc.includes("transferencia") ||
    desc.includes("transferência")
  )
}

/**
 * Map Pluggy txn → app amounts.
 * Credit cards: Pluggy expenses are positive; app uses negative expenses.
 */
export function mapTransaction(
  txn: PluggyTransaction,
  sourceType: AccountSourceType = "checking"
): ParsedTransaction {
  const meta = txn.creditCardMetadata
  let installment: string | null = null
  if (
    meta?.installmentNumber != null &&
    meta?.totalInstallments != null &&
    meta.totalInstallments > 1
  ) {
    installment = `${meta.installmentNumber}/${meta.totalInstallments}`
  }

  let amount = Number(txn.amount)
  if (sourceType === "credit_card") {
    amount = -amount
  }

  return {
    date: txn.date.slice(0, 10),
    description: txn.description,
    amount,
    merchant: txn.merchant?.name ?? undefined,
    installment,
    sourceCategory: txn.category ?? null,
    isTransfer: isTransferHeuristic(txn),
    pending: txn.status === "PENDING",
    externalHash: makeHash("pluggy", txn.id),
    confidence: "high",
  }
}

function mapAssetClass(
  type: string,
  subtype?: string | null
): AssetClass {
  if (type === "FIXED_INCOME") return "renda_fixa"
  if (type === "ETF" || subtype === "ETF") return "etf"
  if (subtype === "REAL_ESTATE_FUND") return "fii"
  if (type === "EQUITY" && subtype === "STOCK") return "acao"
  if (type === "EQUITY") return "acao"
  if (subtype === "FIXED_INCOME_FUND") return "renda_fixa"
  return "outro"
}

export function mapInvestment(inv: PluggyInvestment): ParsedPosition | null {
  if (inv.status === "TOTAL_WITHDRAWAL") return null

  const quantity = Number(inv.quantity) || (inv.balance ? 1 : 0)
  if (!quantity && !inv.balance && inv.amountWithdrawal == null) return null

  const qty = quantity || 1
  let currentPrice = Number(inv.value)
  if (!Number.isFinite(currentPrice) || currentPrice === 0) {
    const amount = Number(inv.amount) || Number(inv.balance) || 0
    currentPrice = amount / qty
  }

  let avgPrice = currentPrice
  if (inv.amountOriginal != null && qty > 0) {
    avgPrice = Number(inv.amountOriginal) / qty
  }

  const purchaseRaw = inv.purchaseDate ?? inv.issueDate
  const purchaseDate = purchaseRaw ? purchaseRaw.slice(0, 10) : null
  const amountOriginal =
    inv.amountOriginal != null && Number.isFinite(Number(inv.amountOriginal))
      ? Number(inv.amountOriginal)
      : null
  const rate =
    inv.rate != null && Number.isFinite(Number(inv.rate))
      ? Number(inv.rate)
      : null

  let amountWithdrawal: number | null = null
  if (
    inv.amountWithdrawal != null &&
    Number.isFinite(Number(inv.amountWithdrawal))
  ) {
    amountWithdrawal = Number(inv.amountWithdrawal)
  } else if (Number.isFinite(Number(inv.balance))) {
    amountWithdrawal = Number(inv.balance)
  } else if (inv.amount != null && Number.isFinite(Number(inv.amount))) {
    amountWithdrawal = Number(inv.amount)
  } else if (Number.isFinite(currentPrice) && qty > 0) {
    amountWithdrawal = currentPrice * qty
  }

  return {
    ticker: inv.code ?? null,
    assetName: inv.name,
    assetClass: mapAssetClass(inv.type, inv.subtype),
    quantity: qty,
    avgPrice: Number.isFinite(avgPrice) ? avgPrice : 0,
    currentPrice: Number.isFinite(currentPrice) ? currentPrice : 0,
    asOf: inv.date.slice(0, 10),
    purchaseDate,
    rate,
    rateType: inv.rateType ?? null,
    amountOriginal,
    amountWithdrawal,
    externalHash: makeHash("pluggy-inv", inv.id),
  }
}

function mapMovementType(
  type: PluggyInvestmentTransaction["type"]
): ParsedMovement["type"] {
  switch (type) {
    case "BUY":
      return "aporte"
    case "SELL":
      return "resgate"
    case "INTEREST":
      return "provento"
    default:
      return "outro"
  }
}

/** Calendar date in America/Sao_Paulo (Pluggy often sends midnight BRT as …T03:00:00.000Z). */
export function pluggyDateToYmd(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso))
}

export function mapInvestmentTransaction(
  txn: PluggyInvestmentTransaction
): ParsedMovement {
  const raw = txn.tradeDate || txn.date
  return {
    date: pluggyDateToYmd(raw),
    type: mapMovementType(txn.type),
    description: txn.description ?? txn.type,
    amount: Number(txn.amount) || 0,
    externalHash: makeHash("pluggy-inv-txn", txn.id),
  }
}

export function defaultTxnDateFrom(): string {
  const env = process.env.PLUGGY_TXN_DATE_FROM
  if (env && /^\d{4}-\d{2}-\d{2}$/.test(env)) return env
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return d.toISOString().slice(0, 10)
}
