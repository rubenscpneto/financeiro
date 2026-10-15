import { calendarYmd } from "./format.ts"

export type TxnClassKind =
  | "income"
  | "expense"
  | "transfer"
  | "card_bill"
  | "card_bill_hidden"
  | "investment_transfer"
  | "loan"
  | "iof"
  | "refund"

export type TxnSubLine = {
  label: string
  amount: number
}

export type TxnClass = {
  kind: TxnClassKind
  isIncome: boolean
  isExpense: boolean
  /** Signed contribution to monthly expense (refunds/cashback are negative). */
  expenseDelta: number
  incomeDelta: number
  /** Add expenseDelta to the row's category total. */
  countInCategory: boolean
  hide: boolean
  pending: boolean
  displayLabel: string | null
  categoryLabel: string | null
  subLines: TxnSubLine[]
  installmentLabel: string | null
}

export type ClassifiableTxn = {
  id?: string
  date?: string | null
  description?: string | null
  amount: number
  source_type?: string | null
  source_category?: string | null
  category_name?: string | null
  category_id?: string | null
  user_category_id?: string | null
  user_category_name?: string | null
  is_transfer?: boolean
  merchant?: string | null
  installment?: string | null
  notes?: string | null
  account_id?: string | null
}

/** Outgoing Pix at or above this amount stays A classificar until the user classifies it. */
export const UNCLASSIFIED_PIX_MIN = 500

/** Query value for the Extrato category filter. */
export const UNCLASSIFIED_FILTER = "a-classificar"

export type DecorateOpts = {
  yearMonth?: string | null
  from?: string | null
  to?: string | null
}

function norm(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function haystack(t: ClassifiableTxn) {
  return [t.description, t.source_category, t.category_name, t.merchant, t.notes]
    .map((v) => norm(v))
    .join(" \n ")
}

export function parseInstallment(
  raw: string | null | undefined
): { current: number; total: number } | null {
  const m = /(\d+)\s*\/\s*(\d+)/.exec((raw ?? "").trim())
  if (!m) return null
  const current = Number(m[1])
  const total = Number(m[2])
  if (!current || !total || current > total || total < 2) return null
  return { current, total }
}

export function addMonthsYm(isoDate: string, months: number): string {
  const [y, m] = isoDate.slice(0, 10).split("-").map(Number)
  const d = new Date(y, m - 1 + months, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function addMonthsDate(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number)
  const dt = new Date(y, m - 1 + months, 1)
  const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate()
  const day = Math.min(d || 1, last)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function isSamePersonTransfer(text: string) {
  return (
    text.includes("same person transfer") ||
    text.includes("same-person transfer") ||
    text.includes("transferencia propria") ||
    text.includes("mesma titularidade")
  )
}

function isLoanCategory(name: string | null | undefined) {
  const n = norm(name)
  return n === "emprestimos" || n === "emprestimo" || n === "loans" || n === "loan"
}

function isLoan(text: string, categoryName?: string | null) {
  if (isLoanCategory(categoryName)) return true
  return (
    /\bemprestimos?\b/.test(text) ||
    /\bloans?\b/.test(text) ||
    text.includes("emprestimo para") ||
    text.includes("emprestimo a") ||
    text.includes("loan to")
  )
}

function isUnclassified(t: ClassifiableTxn) {
  const n = norm(t.category_name)
  if (n === "a classificar" || n === "uncategorized" || n === "sem categoria") {
    return true
  }
  if (t.category_name) return false
  const src = norm(t.source_category)
  return !src || src === "uncategorized" || src === "sem categoria"
}

function spendingCategoryLabel(t: ClassifiableTxn): string | null {
  if (t.user_category_name) {
    const n = norm(t.user_category_name)
    if (n === "a classificar" || n === "uncategorized" || n === "sem categoria") {
      return "A classificar"
    }
    return t.user_category_name
  }
  if (isUnclassified(t)) return "A classificar"
  return t.category_name ?? null
}

export function isOutgoingPix(t: ClassifiableTxn, text = haystack(t)) {
  if ((Number(t.amount) || 0) >= 0) return false
  if (t.source_type === "credit_card") return false
  return /\bpix\b/.test(text) || /transfer\s*-?\s*pix/.test(text)
}

function isCdbOrInvestmentMove(text: string, sourceType?: string | null) {
  if (/\bcdb\b/.test(text)) return true
  if (
    /\b(resgate|aplicacao|vencimento)\b/.test(text) &&
    /\b(rdb|lci|lca|tesouro|titulo|investimento|aplicacao)\b/.test(text)
  ) {
    return true
  }
  if (
    sourceType === "investment" &&
    /\b(resgate|aplicacao|aporte)\b/.test(text)
  ) {
    return true
  }
  return (
    text.includes("aplicacao automatica") ||
    text.includes("resgate automatico") ||
    text.includes("aplicacao investimento") ||
    text.includes("resgate investimento") ||
    text.includes("resgate de cdb") ||
    text.includes("resgate cdb")
  )
}

function isCardBillPayment(text: string, sourceType: string | null | undefined) {
  if (
    text.includes("pagamento recebido") ||
    text.includes("pagto recebido") ||
    text.includes("credit card payment") ||
    text.includes("pagamento de fatura") ||
    text.includes("pagamento fatura") ||
    text.includes("pagto fatura") ||
    text.includes("inclusao de pagamento") ||
    text.includes("pagamento cartao") ||
    text.includes("pagamento do cartao")
  ) {
    return true
  }
  if (
    (sourceType === "checking" || sourceType === "credit_card") &&
    text.includes("fatura") &&
    text.includes("pag")
  ) {
    return true
  }
  return false
}

export function isIofTxn(t: ClassifiableTxn) {
  const text = haystack(t)
  return (
    /\biof\b/.test(text) ||
    text.includes("imposto sobre operacoes") ||
    text.includes("iof compra")
  )
}

export function isRefundTxn(t: ClassifiableTxn) {
  const text = haystack(t)
  return (
    text.includes("estorno") ||
    text.includes("refund") ||
    text.includes("devolucao") ||
    text.includes("cashback") ||
    text.includes("cash back") ||
    text.includes("estornada") ||
    text.includes("credit reversal")
  )
}

export function isPendingTxn(t: ClassifiableTxn) {
  const text = haystack(t)
  return (
    text.includes("pending") ||
    text.includes("pendente") ||
    norm(t.notes) === "pending"
  )
}

function emptyClass(partial: Partial<TxnClass> & { kind: TxnClassKind }): TxnClass {
  return {
    isIncome: false,
    isExpense: false,
    expenseDelta: 0,
    incomeDelta: 0,
    countInCategory: false,
    hide: false,
    pending: false,
    displayLabel: null,
    categoryLabel: null,
    subLines: [],
    installmentLabel: null,
    ...partial,
  }
}

/**
 * Read-time classification of a single row. Grouping (IOF/refund/installments)
 * is applied by `decorateTransactions`.
 */
export function classifyTransaction(t: ClassifiableTxn): TxnClass {
  const text = haystack(t)
  const sourceType = t.source_type ?? null
  const amount = Number(t.amount) || 0
  const pending = isPendingTxn(t)
  const parcela = parseInstallment(t.installment)
  const installmentLabel = parcela ? `Parcela ${parcela.current}/${parcela.total}` : null

  if (isIofTxn(t)) {
    const delta = Math.abs(amount)
    return emptyClass({
      kind: "iof",
      isExpense: delta > 0,
      expenseDelta: delta,
      countInCategory: false,
      pending,
      displayLabel: "IOF",
      categoryLabel: "IOF",
      installmentLabel,
    })
  }

  if (isRefundTxn(t) && amount > 0) {
    return emptyClass({
      kind: "refund",
      expenseDelta: -amount,
      countInCategory: true,
      pending,
      displayLabel: text.includes("cashback") ? "Cashback" : "Estorno",
      categoryLabel: spendingCategoryLabel(t) ?? "A classificar",
      installmentLabel,
    })
  }

  if (isLoan(text, t.user_category_name ?? t.category_name)) {
    return emptyClass({
      kind: "loan",
      pending,
      categoryLabel: "Empréstimos",
      installmentLabel,
    })
  }

  if (isCdbOrInvestmentMove(text, sourceType)) {
    return emptyClass({
      kind: "investment_transfer",
      pending,
      categoryLabel: "Transferência",
      installmentLabel,
    })
  }

  if (isCardBillPayment(text, sourceType)) {
    if (sourceType === "credit_card" && amount > 0) {
      return emptyClass({
        kind: "card_bill_hidden",
        hide: true,
        pending,
        displayLabel: "Fatura paga",
        categoryLabel: "Fatura paga",
        installmentLabel,
      })
    }
    return emptyClass({
      kind: "card_bill",
      pending,
      displayLabel: "Fatura paga",
      categoryLabel: "Fatura paga",
      installmentLabel,
    })
  }

  if (isSamePersonTransfer(text)) {
    if (amount > 0) {
      return emptyClass({
        kind: "income",
        isIncome: true,
        incomeDelta: amount,
        pending,
        categoryLabel: "Receita",
        installmentLabel,
      })
    }
    return emptyClass({
      kind: "transfer",
      pending,
      categoryLabel: "Transferência",
      installmentLabel,
    })
  }

  if (amount > 0) {
    return emptyClass({
      kind: "income",
      isIncome: true,
      incomeDelta: amount,
      pending,
      categoryLabel: spendingCategoryLabel(t) ?? "A classificar",
      installmentLabel,
    })
  }

  if (
    !t.user_category_name &&
    Math.abs(amount) >= UNCLASSIFIED_PIX_MIN &&
    isOutgoingPix(t, text)
  ) {
    return emptyClass({
      kind: "expense",
      isExpense: true,
      expenseDelta: Math.abs(amount),
      countInCategory: true,
      pending,
      categoryLabel: "A classificar",
      installmentLabel,
    })
  }

  const expense = amount < 0 ? Math.abs(amount) : 0
  return emptyClass({
    kind: "expense",
    isExpense: expense > 0,
    expenseDelta: expense,
    countInCategory: expense > 0,
    pending,
    categoryLabel: spendingCategoryLabel(t) ?? "A classificar",
    installmentLabel,
  })
}

function dueYearMonth(t: ClassifiableTxn, originDate?: string | null): string | null {
  if (!t.date) return null
  const parcela = parseInstallment(t.installment)
  const day = calendarYmd(t.date)
  if (!parcela) return day.slice(0, 7)
  return addMonthsYm(originDate || day, parcela.current - 1)
}

function inView(dueYm: string | null, opts: DecorateOpts): boolean {
  if (!dueYm) return true
  if (opts.yearMonth) return dueYm === opts.yearMonth
  const fromYm = opts.from ? opts.from.slice(0, 7) : null
  const toYm = opts.to ? opts.to.slice(0, 7) : null
  if (fromYm && dueYm < fromYm) return false
  if (toYm && dueYm > toYm) return false
  return true
}

function daysApart(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return 99
  const da = Date.parse(`${a.slice(0, 10)}T00:00:00`)
  const db = Date.parse(`${b.slice(0, 10)}T00:00:00`)
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 99
  return Math.abs(da - db) / 86_400_000
}

function stripRefundWords(text: string) {
  return norm(text)
    .replace(/\b(estorno|refund|devolucao|cashback|cash back|estornada)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function installmentGroupKey(t: ClassifiableTxn) {
  const parcela = parseInstallment(t.installment)
  if (!parcela) return null
  const desc = norm(t.description)
    .replace(/\d+\s*\/\s*\d+/g, "")
    .replace(/\bparcela(s)?\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return `${t.account_id ?? ""}|${parcela.total}|${desc}`
}

export type DecoratedTxn<T extends ClassifiableTxn> = T & { class: TxnClass }

/**
 * Attach IOF as a sub-line of the purchase, net refunds against the charge,
 * and keep only the current installment in the viewed month.
 */
export function decorateTransactions<T extends ClassifiableTxn>(
  txns: T[],
  opts: DecorateOpts = {}
): DecoratedTxn<T>[] {
  const rows: DecoratedTxn<T>[] = txns.map((t) => ({
    ...t,
    class: classifyTransaction(t),
  }))

  const groups = new Map<string, DecoratedTxn<T>[]>()
  for (const row of rows) {
    const key = installmentGroupKey(row)
    if (!key) continue
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  const groupOrigin = new Map<string, string>()
  for (const [key, list] of groups) {
    const dates = list
      .map((r) => r.date?.slice(0, 10))
      .filter((d): d is string => Boolean(d))
      .sort()
    if (dates.length) groupOrigin.set(key, dates[0])
  }

  for (const row of rows) {
    const key = installmentGroupKey(row)
    const dueYm = dueYearMonth(row, key ? groupOrigin.get(key) : null)
    if (!inView(dueYm, opts)) {
      row.class.hide = true
      row.class.expenseDelta = 0
      row.class.incomeDelta = 0
      row.class.isExpense = false
      row.class.isIncome = false
      row.class.countInCategory = false
      continue
    }
    const parcela = parseInstallment(row.installment)
    if (parcela && parcela.current < parcela.total && !row.class.hide) {
      const remaining = parcela.total - parcela.current
      row.class.subLines = [
        ...row.class.subLines,
        {
          label: `Restante em ${remaining} parcela${remaining === 1 ? "" : "s"}`,
          amount: 0,
        },
      ]
    }
  }

  const projected: DecoratedTxn<T>[] = []
  for (const [key, list] of groups) {
    const origin = groupOrigin.get(key)
    if (!origin) continue
    const sample = [...list].sort(
      (a, b) =>
        (parseInstallment(b.installment)?.current ?? 0) -
        (parseInstallment(a.installment)?.current ?? 0)
    )[0]
    const parcela = parseInstallment(sample.installment)
    if (!parcela) continue
    const present = new Set(
      list
        .map((r) => parseInstallment(r.installment)?.current)
        .filter((n): n is number => Boolean(n))
    )
    for (let k = 1; k <= parcela.total; k++) {
      const dueYm = addMonthsYm(origin, k - 1)
      if (!inView(dueYm, opts)) continue
      if (present.has(k)) continue
      const date = addMonthsDate(origin, k - 1)
      const clone = {
        ...sample,
        date,
        installment: `${k}/${parcela.total}`,
      }
      if (sample.id) {
        ;(clone as { id?: string }).id = `${sample.id}__p${k}`
      }
      const classed: DecoratedTxn<T> = {
        ...clone,
        class: classifyTransaction(clone),
      }
      const remaining = parcela.total - k
      if (remaining > 0) {
        classed.class.subLines = [
          ...classed.class.subLines,
          {
            label: `Restante em ${remaining} parcela${remaining === 1 ? "" : "s"}`,
            amount: 0,
          },
        ]
      }
      projected.push(classed)
    }
  }
  if (projected.length) rows.push(...projected)

  for (const iof of rows) {
    if (iof.class.kind !== "iof" || iof.class.hide) continue
    const iofAbs = Math.abs(Number(iof.amount) || 0)
    let best: DecoratedTxn<T> | null = null
    let bestScore = Infinity
    for (const parent of rows) {
      if (parent === iof) continue
      if (parent.class.hide) continue
      if (parent.class.kind === "iof") continue
      if (parent.account_id && iof.account_id && parent.account_id !== iof.account_id) {
        continue
      }
      if ((Number(parent.amount) || 0) >= 0) continue
      if (daysApart(parent.date, iof.date) > 2) continue
      const parentAbs = Math.abs(Number(parent.amount) || 0)
      if (parentAbs <= 0) continue
      const ratio = iofAbs / parentAbs
      if (ratio < 0.001 || ratio > 0.12) continue
      const score = Math.min(
        Math.abs(ratio - 0.035),
        Math.abs(ratio - 0.0638),
        Math.abs(ratio - 0.0038)
      )
      if (score < bestScore) {
        bestScore = score
        best = parent
      }
    }
    if (!best) continue
    best.class.subLines = [
      ...best.class.subLines,
      { label: "IOF", amount: -iofAbs },
    ]
    best.class.expenseDelta += iofAbs
    best.class.isExpense = best.class.expenseDelta > 0
    best.class.countInCategory = true
    iof.class.hide = true
    iof.class.expenseDelta = 0
    iof.class.isExpense = false
    iof.class.countInCategory = false
  }

  for (const refund of rows) {
    if (refund.class.kind !== "refund" || refund.class.hide) continue
    const refundAbs = Math.abs(Number(refund.amount) || 0)
    const refundKey = stripRefundWords(refund.description ?? "")
    let best: DecoratedTxn<T> | null = null
    for (const parent of rows) {
      if (parent === refund) continue
      if (parent.class.hide) continue
      if (parent.class.kind === "refund" || parent.class.kind === "iof") continue
      if (parent.account_id && refund.account_id && parent.account_id !== refund.account_id) {
        continue
      }
      if ((Number(parent.amount) || 0) >= 0) continue
      if (Math.abs(Math.abs(Number(parent.amount)) - refundAbs) > 0.02) continue
      if (daysApart(parent.date, refund.date) > 62) continue
      const parentKey = stripRefundWords(parent.description ?? "")
      if (refundKey && parentKey && !parentKey.includes(refundKey) && !refundKey.includes(parentKey)) {
        continue
      }
      best = parent
      break
    }
    if (!best) continue
    best.class.subLines = [
      ...best.class.subLines,
      {
        label: refund.class.displayLabel ?? "Estorno",
        amount: refundAbs,
      },
    ]
    best.class.expenseDelta += refund.class.expenseDelta
    best.class.isExpense = best.class.expenseDelta > 0
    refund.class.hide = true
    refund.class.expenseDelta = 0
    refund.class.countInCategory = false
  }

  return rows
}

export function sumSpending<
  T extends { class: Pick<TxnClass, "hide" | "expenseDelta"> },
>(rows: T[]): number {
  return rows.reduce((s, t) => (t.class.hide ? s : s + t.class.expenseDelta), 0)
}

export function displayCategoryLabel(t: {
  class?: { categoryLabel?: string | null }
}): string {
  return t.class?.categoryLabel || "A classificar"
}

export function isUnclassifiedRow(t: {
  class?: { categoryLabel?: string | null }
  user_category_id?: string | null
}): boolean {
  if (t.user_category_id) return false
  const label = t.class?.categoryLabel
  return !label || label === "A classificar"
}

export function matchesCategoryFilter(
  t: {
    class: { categoryLabel?: string | null }
    user_category_id?: string | null
    category_id?: string | null
  },
  filterId: string
): boolean {
  if (!filterId) return true
  if (filterId === UNCLASSIFIED_FILTER) {
    return isUnclassifiedRow(t)
  }
  return t.user_category_id === filterId || (!t.user_category_id && t.category_id === filterId)
}

export type FlowFilter = "all" | "out" | "in"

const OWN_ACCOUNT_MOVE = new Set([
  "transfer",
  "card_bill",
  "card_bill_hidden",
  "investment_transfer",
])

export function matchesFlowFilter(
  t: {
    class: Pick<TxnClass, "kind" | "hide" | "expenseDelta" | "incomeDelta">
    amount: number
  },
  flow: FlowFilter
): boolean {
  if (flow === "all") return !t.class.hide
  if (t.class.hide) return false
  if (OWN_ACCOUNT_MOVE.has(t.class.kind)) return false
  if (flow === "out") {
    if (t.class.kind === "loan") return false
    return t.class.expenseDelta !== 0
  }
  return t.class.incomeDelta > 0
}

export function summarizeFlow<
  T extends { class: Pick<TxnClass, "hide" | "incomeDelta" | "expenseDelta"> },
>(rows: T[]): { entrou: number; saiu: number; sobrou: number } {
  let entrou = 0
  let saiu = 0
  for (const t of rows) {
    if (t.class.hide) continue
    entrou += t.class.incomeDelta
    saiu += t.class.expenseDelta
  }
  return { entrou, saiu, sobrou: entrou - saiu }
}

/** User override wins; unclassified "A classificar" does not count toward a Pluggy category. */
export function spendCategoryId(t: {
  user_category_id?: string | null
  category_id?: string | null
  class?: { categoryLabel?: string | null }
}): string | null {
  if (t.user_category_id) return t.user_category_id
  if (t.class?.categoryLabel === "A classificar") return null
  return t.category_id ?? null
}

export function showLoansBlock(categoryFilter: string): boolean {
  return categoryFilter !== UNCLASSIFIED_FILTER
}

export function groupRowsByDateDesc<T extends { date?: string | null }>(
  rows: T[]
): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const t of rows) {
    const day = t.date ? calendarYmd(t.date) : ""
    if (!day) continue
    const list = map.get(day) ?? []
    list.push(t)
    map.set(day, list)
  }
  return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
}

export function countsAsIncome(t: ClassifiableTxn) {
  return classifyTransaction(t).isIncome
}

export function countsAsExpense(t: ClassifiableTxn) {
  return classifyTransaction(t).isExpense
}
