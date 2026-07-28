const PLUGGY_BASE = "https://api.pluggy.ai"

export type PluggyAccount = {
  id: string
  type: "BANK" | "CREDIT"
  subtype: "SAVINGS_ACCOUNT" | "CHECKING_ACCOUNT" | "CREDIT_CARD"
  number: string
  name: string
  balance: number
  itemId: string
  currencyCode: string
  creditData?: {
    brand?: string
    level?: string
  } | null
}

export type PluggyTransaction = {
  id: string
  description: string
  descriptionRaw?: string | null
  amount: number
  date: string
  type?: "DEBIT" | "CREDIT"
  status?: "POSTED" | "PENDING"
  category?: string | null
  accountId: string
  merchant?: { name?: string } | null
  paymentData?: { paymentMethod?: string } | null
  creditCardMetadata?: {
    installmentNumber?: number
    totalInstallments?: number
  } | null
}

export type PluggyInvestment = {
  id: string
  itemId: string
  type: string
  subtype?: string | null
  name: string
  code?: string | null
  balance: number
  quantity?: number | null
  value?: number | null
  amount?: number | null
  amountOriginal?: number | null
  amountProfit?: number | null
  amountWithdrawal?: number | null
  date: string
  purchaseDate?: string | null
  issueDate?: string | null
  rate?: number | null
  rateType?: string | null
  status?: "ACTIVE" | "PENDING" | "TOTAL_WITHDRAWAL" | null
}

export type PluggyInvestmentTransaction = {
  id: string
  type: "BUY" | "SELL" | "TAX" | "TRANSFER" | "INTEREST" | "AMORTIZATION"
  amount?: number | null
  date: string
  tradeDate?: string | null
  description?: string | null
  quantity?: number | null
  value?: number | null
}

type CursorPage<T> = {
  results: T[]
  next: string | null
}

type PageResults<T> = {
  results: T[]
  page: number
  total: number
  totalPages: number
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env ${name}`)
  return value
}

async function pluggyFetch<T>(
  apiKey: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${PLUGGY_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Pluggy ${path} → ${res.status}: ${body || res.statusText}`)
  }
  return res.json() as Promise<T>
}

export async function getApiKey(): Promise<string> {
  const clientId = requireEnv("PLUGGY_CLIENT_ID")
  const clientSecret = requireEnv("PLUGGY_CLIENT_SECRET")
  const res = await fetch(`${PLUGGY_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
    cache: "no-store",
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Pluggy auth failed (${res.status}): ${body || res.statusText}`)
  }
  const data = (await res.json()) as { apiKey: string }
  return data.apiKey
}

export function getItemId(): string {
  return requireEnv("PLUGGY_ITEM_ID")
}

export type PluggyItem = {
  id: string
  status: string
  executionStatus: string
  error?: { code?: string; message?: string } | null
  connector?: {
    id?: number
    name?: string
    imageUrl?: string | null
  } | null
}

/** Statuses that mean the Item cannot return fresh/complete data. */
const BLOCKED_ITEM_STATUSES = new Set([
  "LOGIN_ERROR",
  "OUTDATED",
  "WAITING_USER_INPUT",
  "WAITING_USER_ACTION",
])

export async function fetchItem(
  apiKey: string,
  itemId: string
): Promise<PluggyItem> {
  return pluggyFetch<PluggyItem>(apiKey, `/items/${encodeURIComponent(itemId)}`)
}

export function assertItemReady(item: PluggyItem): void {
  if (BLOCKED_ITEM_STATUSES.has(item.status)) {
    const detail = item.error?.message ?? item.executionStatus
    throw new Error(
      `Item Pluggy indisponível (status=${item.status}${detail ? `: ${detail}` : ""}). Reconecte no Meu Pluggy.`
    )
  }
}

export async function fetchAccounts(
  apiKey: string,
  itemId: string
): Promise<PluggyAccount[]> {
  const all: PluggyAccount[] = []
  let page = 1
  let totalPages = 1
  while (page <= totalPages) {
    const data = await pluggyFetch<PageResults<PluggyAccount>>(
      apiKey,
      `/accounts?itemId=${encodeURIComponent(itemId)}&page=${page}&pageSize=500`
    )
    all.push(...(data.results ?? []))
    totalPages = data.totalPages ?? 1
    page += 1
  }
  return all
}

export async function fetchAllTransactions(
  apiKey: string,
  accountId: string,
  dateFrom?: string
): Promise<PluggyTransaction[]> {
  const results: PluggyTransaction[] = []
  const params = new URLSearchParams({ accountId })
  if (dateFrom) params.set("dateFrom", dateFrom)

  let path: string | null = `/v2/transactions?${params.toString()}`
  while (path) {
    const page: CursorPage<PluggyTransaction> = await pluggyFetch(
      apiKey,
      path
    )
    results.push(...(page.results ?? []))
    if (!page.next) break
    path = page.next.startsWith("/") ? page.next : `/v2/transactions${page.next}`
  }
  return results
}

export async function fetchInvestments(
  apiKey: string,
  itemId: string
): Promise<PluggyInvestment[]> {
  const all: PluggyInvestment[] = []
  let page = 1
  let totalPages = 1
  while (page <= totalPages) {
    const data = await pluggyFetch<PageResults<PluggyInvestment>>(
      apiKey,
      `/investments?itemId=${encodeURIComponent(itemId)}&page=${page}&pageSize=500`
    )
    all.push(...(data.results ?? []))
    totalPages = data.totalPages ?? 1
    page += 1
  }
  return all
}

export async function fetchInvestmentTransactions(
  apiKey: string,
  investmentId: string
): Promise<PluggyInvestmentTransaction[]> {
  const all: PluggyInvestmentTransaction[] = []
  let page = 1
  let totalPages = 1
  while (page <= totalPages) {
    const data = await pluggyFetch<PageResults<PluggyInvestmentTransaction>>(
      apiKey,
      `/investments/${encodeURIComponent(investmentId)}/transactions?page=${page}&pageSize=500`
    )
    all.push(...(data.results ?? []))
    totalPages = data.totalPages ?? 1
    page += 1
  }
  return all
}
