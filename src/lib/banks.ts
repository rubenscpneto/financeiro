import type { DecoratedTxn, ClassifiableTxn, TxnClass } from "./txn-class"

type ExtraMeta = {
  transferNumber?: string | null
  compe?: string | null
  institutionName?: string | null
  connectorName?: string | null
}

export type BankRef = { key: string; name: string }

export type BankGroup = {
  key: string
  name: string
  accountIds: string[]
  balanceAccountIds: string[]
  primaryAccountIds: string[]
}

export type BankAccountInput = {
  id?: string
  institution: string | null
  name?: string | null
  type?: string | null
  last4?: string | null
  extra_meta?: string | ExtraMeta | null
  extra?: ExtraMeta | null
  updated_at?: Date | string | null
  pluggy_account_id?: string | null
}

const COMPE_BANKS: Record<string, BankRef> = {
  "001": { key: "bb", name: "Banco do Brasil" },
  "033": { key: "santander", name: "Santander" },
  "077": { key: "inter", name: "Inter" },
  "104": { key: "caixa", name: "Caixa" },
  "197": { key: "stone", name: "Stone" },
  "208": { key: "btg", name: "BTG" },
  "212": { key: "original", name: "Original" },
  "237": { key: "bradesco", name: "Bradesco" },
  "260": { key: "nubank", name: "Nubank" },
  "290": { key: "pagbank", name: "PagBank" },
  "323": { key: "mercadopago", name: "Mercado Pago" },
  "336": { key: "c6", name: "C6" },
  "341": { key: "itau", name: "Itaú" },
  "380": { key: "picpay", name: "PicPay" },
  "623": { key: "pan", name: "Pan" },
}

const NAME_BANKS: { re: RegExp; bank: BankRef }[] = [
  { re: /\bc6\b|banco\s*c6|c6\s*bank/, bank: { key: "c6", name: "C6" } },
  { re: /\bnubank\b|\bnu\s*pagamentos\b|\bnu\b/, bank: { key: "nubank", name: "Nubank" } },
  { re: /\bitau\b|\bitaú\b/, bank: { key: "itau", name: "Itaú" } },
  { re: /\bbradesco\b/, bank: { key: "bradesco", name: "Bradesco" } },
  { re: /\bsantander\b/, bank: { key: "santander", name: "Santander" } },
  { re: /\binter\b/, bank: { key: "inter", name: "Inter" } },
  { re: /\bcaixa\b/, bank: { key: "caixa", name: "Caixa" } },
  { re: /\bbanco do brasil\b|\bbb\b/, bank: { key: "bb", name: "Banco do Brasil" } },
  { re: /\bpicpay\b/, bank: { key: "picpay", name: "PicPay" } },
  { re: /\bpagbank\b|\bpagseguro\b/, bank: { key: "pagbank", name: "PagBank" } },
  { re: /\bmercado\s*pago\b/, bank: { key: "mercadopago", name: "Mercado Pago" } },
  { re: /\bbtg\b/, bank: { key: "btg", name: "BTG" } },
  { re: /\boriginal\b/, bank: { key: "original", name: "Original" } },
]

function fold(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function bankKey(institution: string | null | undefined): string {
  const resolved = lookupBankName(institution)
  if (resolved) return resolved.key
  const n = (institution ?? "").trim() || "outros"
  return n
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function isAggregatorName(name: string | null | undefined): boolean {
  const n = fold(name).replace(/[\s_-]+/g, "")
  if (!n) return false
  return (
    n.includes("meupluggy") ||
    n === "pluggy" ||
    n.includes("openfinance")
  )
}

function metaOf(account: BankAccountInput): ExtraMeta {
  if (account.extra && typeof account.extra === "object") return account.extra
  if (account.extra_meta && typeof account.extra_meta === "object") {
    return account.extra_meta
  }
  if (typeof account.extra_meta !== "string" || !account.extra_meta) return {}
  try {
    const parsed = JSON.parse(account.extra_meta) as ExtraMeta
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function compeFrom(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, "")
  if (digits.length >= 3) {
    const code = digits.slice(0, 3)
    if (COMPE_BANKS[code]) return code
  }
  const m = raw.match(/\b(\d{3})\b/)
  return m && COMPE_BANKS[m[1]] ? m[1] : null
}

function lookupBankName(raw: string | null | undefined): BankRef | null {
  const n = fold(raw)
  if (!n || isAggregatorName(raw)) return null
  for (const { re, bank } of NAME_BANKS) {
    if (re.test(n)) return bank
  }
  const compe = compeFrom(raw)
  if (compe) return COMPE_BANKS[compe]
  return null
}

function displayName(raw: string | null | undefined, fallback = "Outros"): string {
  const known = lookupBankName(raw)
  if (known) return known.name
  const trimmed = (raw ?? "").trim()
  if (!trimmed || isAggregatorName(trimmed)) return fallback
  return trimmed
}

export function resolveBank(account: BankAccountInput): BankRef {
  const meta = metaOf(account)
  const compe =
    compeFrom(meta.compe) ||
    compeFrom(meta.transferNumber) ||
    compeFrom(meta.institutionName)
  if (compe && COMPE_BANKS[compe]) return COMPE_BANKS[compe]

  const fromMetaName = lookupBankName(meta.institutionName)
  if (fromMetaName) return fromMetaName

  const fromInstitution = lookupBankName(account.institution)
  if (fromInstitution) return fromInstitution

  const fromName = lookupBankName(account.name)
  if (fromName) return fromName

  if (isAggregatorName(account.institution) || isAggregatorName(meta.connectorName)) {
    return { key: "banco", name: "Banco" }
  }

  const raw = (account.institution ?? "").trim() || "Outros"
  return { key: bankKey(raw), name: displayName(raw) }
}

function isPrimaryAccount(account: BankAccountInput): boolean {
  const meta = metaOf(account)
  return (
    isAggregatorName(account.institution) ||
    isAggregatorName(meta.connectorName)
  )
}

function updatedMs(account: BankAccountInput): number {
  if (!account.updated_at) return 0
  const t =
    account.updated_at instanceof Date
      ? account.updated_at.getTime()
      : Date.parse(String(account.updated_at))
  return Number.isFinite(t) ? t : 0
}

function duplicateKey(account: BankAccountRow, bank: BankRef): string {
  const last4 = (account.last4 ?? "").replace(/\D/g, "").slice(-4)
  const type = account.type ?? "checking"
  if (last4) return `${bank.key}|${type}|${last4}`
  const name = fold(account.name).replace(/[^a-z0-9]+/g, "")
  return `${bank.key}|${type}|${name || account.id}`
}

function rankAccount(account: BankAccountInput): number {
  let score = updatedMs(account)
  if (isPrimaryAccount(account)) score += 1e15
  return score
}

export type BankAccountRow = BankAccountInput & { id: string }

export function groupAccountsByBank(accounts: BankAccountRow[]): BankGroup[] {
  const resolved = accounts.map((account) => ({
    account,
    bank: resolveBank(account),
  }))

  const realBanks = resolved.filter((r) => r.bank.key !== "banco")
  const onlyAggregator = resolved.filter((r) => r.bank.key === "banco")
  if (onlyAggregator.length && realBanks.length === 1) {
    const foldInto = realBanks[0].bank
    for (const row of onlyAggregator) row.bank = foldInto
  } else if (onlyAggregator.length && realBanks.length === 0) {
    /* leave as Banco — still not MeuPluggy */
  } else if (onlyAggregator.length && realBanks.length > 1) {
    const keys = new Set(realBanks.map((r) => r.bank.key))
    if (keys.size === 1) {
      const foldInto = realBanks[0].bank
      for (const row of onlyAggregator) row.bank = foldInto
    }
  }

  const map = new Map<
    string,
    { bank: BankRef; rows: typeof resolved }
  >()
  for (const row of resolved) {
    const existing = map.get(row.bank.key)
    if (existing) existing.rows.push(row)
    else map.set(row.bank.key, { bank: row.bank, rows: [row] })
  }

  const groups: BankGroup[] = []
  for (const { bank, rows } of map.values()) {
    const clusters = new Map<string, BankAccountRow[]>()
    for (const { account } of rows) {
      const key = duplicateKey(account, bank)
      const list = clusters.get(key) ?? []
      list.push(account)
      clusters.set(key, list)
    }
    const accountIds = rows.map((r) => r.account.id)
    const primaryAccountIds: string[] = []
    const balanceAccountIds: string[] = []
    const seenTypes = new Set<string>()

    const clusterList = [...clusters.values()].map((list) => {
      const sorted = [...list].sort((a, b) => rankAccount(b) - rankAccount(a))
      return { winner: sorted[0], rest: sorted.slice(1), type: sorted[0].type ?? "checking" }
    })
    clusterList.sort((a, b) => rankAccount(b.winner) - rankAccount(a.winner))

    for (const cluster of clusterList) {
      const id = cluster.winner.id
      if (isPrimaryAccount(cluster.winner) || !seenTypes.has(cluster.type)) {
        balanceAccountIds.push(id)
        seenTypes.add(cluster.type)
      }
      if (isPrimaryAccount(cluster.winner)) primaryAccountIds.push(id)
    }
    if (primaryAccountIds.length === 0 && balanceAccountIds[0]) {
      primaryAccountIds.push(balanceAccountIds[0])
    }

    groups.push({
      key: bank.key,
      name: bank.name,
      accountIds,
      balanceAccountIds,
      primaryAccountIds,
    })
  }

  return groups.sort(
    (a, b) => a.name.localeCompare(b.name, "pt-BR") || a.key.localeCompare(b.key)
  )
}

export function pickBalanceAccountIds(
  accounts: BankAccountRow[],
  group?: BankGroup
): string[] {
  const groups = group ? [group] : groupAccountsByBank(accounts)
  if (group && !group.balanceAccountIds.length) {
    return groupAccountsByBank(accounts).find((g) => g.key === group.key)
      ?.balanceAccountIds ?? []
  }
  return groups.flatMap((g) => g.balanceAccountIds)
}

/** Account ids for a bank filter. `null` = Todos. Empty array = unknown bank. */
export function accountIdsForBank(
  groups: BankGroup[],
  key: string | null | undefined
): string[] | null {
  if (!key) return null
  return groups.find((g) => g.key === key)?.accountIds ?? []
}

export function balanceIdsForBank(
  groups: BankGroup[],
  key: string | null | undefined
): string[] | null {
  if (!key) return null
  return groups.find((g) => g.key === key)?.balanceAccountIds ?? []
}

export function bankHeadlineSuffix(
  groups: BankGroup[],
  key: string | null | undefined
): string {
  if (!key) return ""
  const g = groups.find((b) => b.key === key)
  return g ? ` no ${g.name}` : ""
}

export function normalizeTxnDescription(value: string | null | undefined): string {
  return fold(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function txnDedupeKey(t: {
  date?: string | null
  amount: number
  description?: string | null
}): string {
  const date = (t.date ?? "").slice(0, 10)
  const amount = Number(t.amount) || 0
  return `${date}|${amount.toFixed(2)}|${normalizeTxnDescription(t.description)}`
}

export function dedupeTransactions<T extends {
  id: string
  account_id?: string | null
  date?: string | null
  amount: number
  description?: string | null
}>(
  txns: T[],
  opts: { primaryAccountIds?: Set<string> } = {}
): T[] {
  const primary = opts.primaryAccountIds ?? new Set<string>()
  const best = new Map<string, T>()
  for (const txn of txns) {
    const key = txnDedupeKey(txn)
    const current = best.get(key)
    if (!current) {
      best.set(key, txn)
      continue
    }
    const txnPrimary = txn.account_id ? primary.has(txn.account_id) : false
    const curPrimary = current.account_id ? primary.has(current.account_id) : false
    if (txnPrimary && !curPrimary) best.set(key, txn)
  }
  const keptIds = new Set([...best.values()].map((t) => t.id))
  return txns.filter((t) => keptIds.has(t.id))
}

function daysApart(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return 99
  const da = Date.parse(`${a.slice(0, 10)}T00:00:00`)
  const db = Date.parse(`${b.slice(0, 10)}T00:00:00`)
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 99
  return Math.abs(da - db) / 86_400_000
}

function asTransferClass(cls: TxnClass, label: string): TxnClass {
  return {
    ...cls,
    kind: "transfer",
    isIncome: false,
    isExpense: false,
    expenseDelta: 0,
    incomeDelta: 0,
    countInCategory: false,
    displayLabel: label,
    categoryLabel: "Transferência",
  }
}

export function applyOwnBankTransfers<T extends ClassifiableTxn>(
  rows: DecoratedTxn<T>[],
  opts: {
    filteredBankKey?: string | null
    accountBankById: Map<string, BankRef>
  }
): DecoratedTxn<T>[] {
  const { accountBankById } = opts
  const used = new Set<string>()
  const counterpart = new Map<string, BankRef>()

  for (let i = 0; i < rows.length; i++) {
    const a = rows[i]
    const aid = a.id ?? `i${i}`
    if (used.has(aid)) continue
    const bankA = a.account_id ? accountBankById.get(a.account_id) : undefined
    if (!bankA) continue
    const amtA = Number(a.amount) || 0
    if (!amtA) continue
    for (let j = i + 1; j < rows.length; j++) {
      const b = rows[j]
      const bid = b.id ?? `j${j}`
      if (used.has(bid)) continue
      const bankB = b.account_id ? accountBankById.get(b.account_id) : undefined
      if (!bankB || bankB.key === bankA.key) continue
      const amtB = Number(b.amount) || 0
      if (Math.sign(amtA) === Math.sign(amtB)) continue
      if (Math.abs(Math.abs(amtA) - Math.abs(amtB)) > 0.02) continue
      if (daysApart(a.date, b.date) > 1) continue
      counterpart.set(aid, bankB)
      counterpart.set(bid, bankA)
      used.add(aid)
      used.add(bid)
      break
    }
  }

  return rows.map((row, idx) => {
    const id = row.id ?? `i${idx}`
    const other = counterpart.get(id)
    if (!other) return row
    const amount = Number(row.amount) || 0
    const label = amount < 0 ? `Saiu pro ${other.name}` : `Veio do ${other.name}`
    return { ...row, class: asTransferClass(row.class, label) }
  })
}

export const BANK_FILTER_STORAGE_KEY = "financeiro-bank"

export function primaryAccountIds(groups: BankGroup[]): Set<string> {
  return new Set(groups.flatMap((g) => g.primaryAccountIds))
}

export function accountBankById(groups: BankGroup[]): Map<string, BankRef> {
  const map = new Map<string, BankRef>()
  for (const g of groups) {
    for (const id of g.accountIds) {
      map.set(id, { key: g.key, name: g.name })
    }
  }
  return map
}

export function filterByAccountIds<T extends { account_id?: string | null }>(
  rows: T[],
  accountIds: string[] | null
): T[] {
  if (accountIds == null) return rows
  const set = new Set(accountIds)
  return rows.filter((r) => r.account_id != null && set.has(r.account_id))
}
