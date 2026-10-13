export type TxnClassKind =
  | "income"
  | "expense"
  | "transfer"
  | "card_bill"
  | "card_bill_hidden"
  | "investment_transfer"
  | "loan"

export type TxnClass = {
  kind: TxnClassKind
  /** Counts toward monthly income. */
  isIncome: boolean
  /** Counts toward monthly expense (card purchases, not bill payments). */
  isExpense: boolean
  /** Hide from Extrato (card-side bill payment). */
  hide: boolean
  displayLabel: string | null
  categoryLabel: string | null
}

export type ClassifiableTxn = {
  description?: string | null
  amount: number
  source_type?: string | null
  source_category?: string | null
  category_name?: string | null
  is_transfer?: boolean
}

function norm(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function haystack(t: ClassifiableTxn) {
  return [
    t.description,
    t.source_category,
    t.category_name,
  ]
    .map((v) => norm(v))
    .join(" \n ")
}

function isSamePersonTransfer(text: string) {
  return (
    text.includes("same person transfer") ||
    text.includes("same-person transfer") ||
    text.includes("transferencia propria") ||
    text.includes("mesma titularidade")
  )
}

function isLoan(text: string) {
  return (
    /\bemprestimos?\b/.test(text) ||
    /\bloans?\b/.test(text) ||
    text.includes("emprestimo para") ||
    text.includes("emprestimo a") ||
    text.includes("loan to")
  )
}

function isCdbOrInvestmentMove(text: string) {
  if (/\bcdb\b/.test(text)) return true
  if (
    (text.includes("aplicacao") || text.includes("aplicacao automatica")) &&
    (text.includes("cdb") ||
      text.includes("rdb") ||
      text.includes("lci") ||
      text.includes("lca") ||
      text.includes("tesouro") ||
      text.includes("investimento"))
  ) {
    return true
  }
  if (
    (text.includes("resgate") || text.includes("resgate automatico")) &&
    (text.includes("cdb") ||
      text.includes("rdb") ||
      text.includes("lci") ||
      text.includes("lca") ||
      text.includes("tesouro") ||
      text.includes("investimento"))
  ) {
    return true
  }
  return (
    text.includes("aplicacao automatica") ||
    text.includes("resgate automatico") ||
    text.includes("aplicacao investimento") ||
    text.includes("resgate investimento")
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
    (text.includes("fatura") && text.includes("pag"))
  ) {
    return true
  }
  return false
}

/**
 * Read-time classification. Does not mutate stored rows.
 *
 * - Credit card purchases (negative on the card) = expense
 * - Paying the card bill from checking is not expense; card-side "Pagamento
 *   recebido" is hidden so the checking side can show as "Fatura paga"
 * - CDB apply/redeem = internal transfer
 * - Same-person transfer incoming = income
 * - Family loans = Empréstimos, excluded from income/expense
 */
export function classifyTransaction(t: ClassifiableTxn): TxnClass {
  const text = haystack(t)
  const sourceType = t.source_type ?? null
  const amount = Number(t.amount) || 0

  if (isLoan(text)) {
    return {
      kind: "loan",
      isIncome: false,
      isExpense: false,
      hide: false,
      displayLabel: null,
      categoryLabel: "Empréstimos",
    }
  }

  if (isCdbOrInvestmentMove(text)) {
    return {
      kind: "investment_transfer",
      isIncome: false,
      isExpense: false,
      hide: false,
      displayLabel: null,
      categoryLabel: "Transferência",
    }
  }

  if (isCardBillPayment(text, sourceType)) {
    if (sourceType === "credit_card" && amount > 0) {
      return {
        kind: "card_bill_hidden",
        isIncome: false,
        isExpense: false,
        hide: true,
        displayLabel: "Fatura paga",
        categoryLabel: "Fatura paga",
      }
    }
    return {
      kind: "card_bill",
      isIncome: false,
      isExpense: false,
      hide: false,
      displayLabel: "Fatura paga",
      categoryLabel: "Fatura paga",
    }
  }

  if (isSamePersonTransfer(text)) {
    if (amount > 0) {
      return {
        kind: "income",
        isIncome: true,
        isExpense: false,
        hide: false,
        displayLabel: null,
        categoryLabel: "Receita",
      }
    }
    return {
      kind: "transfer",
      isIncome: false,
      isExpense: false,
      hide: false,
      displayLabel: null,
      categoryLabel: "Transferência",
    }
  }

  if (t.is_transfer) {
    return {
      kind: "transfer",
      isIncome: false,
      isExpense: false,
      hide: false,
      displayLabel: null,
      categoryLabel: "Transferência",
    }
  }

  if (amount > 0) {
    return {
      kind: "income",
      isIncome: true,
      isExpense: false,
      hide: false,
      displayLabel: null,
      categoryLabel: null,
    }
  }

  return {
    kind: "expense",
    isIncome: false,
    isExpense: amount < 0,
    hide: false,
    displayLabel: null,
    categoryLabel: null,
  }
}

export function countsAsIncome(t: ClassifiableTxn) {
  return classifyTransaction(t).isIncome
}

export function countsAsExpense(t: ClassifiableTxn) {
  return classifyTransaction(t).isExpense
}
