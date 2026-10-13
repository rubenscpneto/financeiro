import assert from "node:assert/strict"
import test from "node:test"
import { classifyTransaction, decorateTransactions } from "../txn-class.ts"
import { categoryLabelPt } from "../pluggy-categories-pt.ts"
import { groupAccountsByBank, accountIdsForBank } from "../banks.ts"

test("card bill from checking is not expense", () => {
  const c = classifyTransaction({
    description: "Pagamento fatura cartão",
    amount: -1200,
    source_type: "checking",
    is_transfer: false,
  })
  assert.equal(c.kind, "card_bill")
  assert.equal(c.isExpense, false)
  assert.equal(c.displayLabel, "Fatura paga")
})

test("card-side pagamento recebido is hidden", () => {
  const c = classifyTransaction({
    description: "Pagamento recebido",
    amount: 1200,
    source_type: "credit_card",
    is_transfer: false,
  })
  assert.equal(c.hide, true)
  assert.equal(c.isIncome, false)
})

test("credit card purchase is expense", () => {
  const c = classifyTransaction({
    description: "Padaria",
    amount: -45,
    source_type: "credit_card",
    source_category: "Food",
  })
  assert.equal(c.isExpense, true)
})

test("CDB application is internal transfer", () => {
  const c = classifyTransaction({
    description: "Aplicação CDB",
    amount: -5000,
    source_type: "checking",
  })
  assert.equal(c.kind, "investment_transfer")
  assert.equal(c.isExpense, false)
  assert.equal(c.isIncome, false)
})

test("same person transfer incoming is income", () => {
  const c = classifyTransaction({
    description: "Pix",
    amount: 200,
    source_category: "Same Person Transfer",
    is_transfer: true,
  })
  assert.equal(c.isIncome, true)
  assert.equal(c.kind, "income")
})

test("family loan is Empréstimos and excluded from I/E", () => {
  const c = classifyTransaction({
    description: "Empréstimo para Ana",
    amount: -800,
    source_type: "checking",
  })
  assert.equal(c.kind, "loan")
  assert.equal(c.categoryLabel, "Empréstimos")
  assert.equal(c.isExpense, false)
})

test("Pluggy English categories map to pt-BR", () => {
  assert.equal(categoryLabelPt("Food"), "Alimentação")
  assert.equal(categoryLabelPt("Transportation"), "Transporte")
  assert.equal(categoryLabelPt("Same Person Transfer"), "Transferência própria")
  assert.equal(categoryLabelPt("Alimentação"), "Alimentação")
})

test("accounts group by bank", () => {
  const groups = groupAccountsByBank([
    { id: "1", institution: "C6 Bank" },
    { id: "2", institution: "C6 Bank" },
    { id: "3", institution: "Nubank" },
  ])
  assert.equal(groups.length, 2)
  assert.deepEqual(
    accountIdsForBank(groups, "c6-bank")?.sort(),
    ["1", "2"]
  )
  assert.equal(accountIdsForBank(groups, null), null)
})

test("IOF attaches to the purchase as a sub-line, not a separate expense", () => {
  const rows = decorateTransactions(
    [
      {
        id: "p",
        date: "2026-10-10",
        account_id: "card",
        description: "Uber Trip USD",
        amount: -100,
        source_type: "credit_card",
        category_id: "cat-food",
      },
      {
        id: "i",
        date: "2026-10-10",
        account_id: "card",
        description: "IOF compra internacional",
        amount: -3.5,
        source_type: "credit_card",
        category_id: "cat-tax",
      },
    ],
    { yearMonth: "2026-10" }
  )
  const purchase = rows.find((r) => r.id === "p")!
  const iof = rows.find((r) => r.id === "i")!
  assert.equal(iof.class.hide, true)
  assert.equal(iof.class.expenseDelta, 0)
  assert.equal(purchase.class.expenseDelta, 103.5)
  assert.equal(purchase.class.subLines.some((s) => s.label === "IOF"), true)
})

test("refunds and cashback reduce expense and are never income", () => {
  const charge = classifyTransaction({
    description: "Anuidade",
    amount: -80,
    source_type: "credit_card",
  })
  const refund = classifyTransaction({
    description: "Estorno anuidade",
    amount: 80,
    source_type: "credit_card",
  })
  assert.equal(refund.isIncome, false)
  assert.equal(refund.kind, "refund")
  assert.equal(charge.expenseDelta + refund.expenseDelta, 0)

  const rows = decorateTransactions(
    [
      {
        id: "a",
        date: "2026-10-01",
        account_id: "card",
        description: "Anuidade",
        amount: -80,
        source_type: "credit_card",
        category_id: "fees",
      },
      {
        id: "b",
        date: "2026-10-02",
        account_id: "card",
        description: "Estorno anuidade",
        amount: 80,
        source_type: "credit_card",
        category_id: "fees",
      },
    ],
    { yearMonth: "2026-10" }
  )
  assert.equal(
    rows.reduce((s, r) => s + (r.class.hide ? 0 : r.class.expenseDelta), 0),
    0
  )
  assert.equal(rows.every((r) => !r.class.isIncome), true)
})

test("only the current installment counts in the month", () => {
  const rows = decorateTransactions(
    [
      {
        id: "1",
        date: "2026-10-05",
        account_id: "card",
        description: "Magazine Luiza",
        amount: -100,
        installment: "1/3",
        source_type: "credit_card",
      },
      {
        id: "2",
        date: "2026-10-05",
        account_id: "card",
        description: "Magazine Luiza",
        amount: -100,
        installment: "2/3",
        source_type: "credit_card",
      },
      {
        id: "3",
        date: "2026-10-05",
        account_id: "card",
        description: "Magazine Luiza",
        amount: -100,
        installment: "3/3",
        source_type: "credit_card",
      },
    ],
    { yearMonth: "2026-10" }
  )
  assert.equal(rows.find((r) => r.id === "1")!.class.hide, false)
  assert.equal(rows.find((r) => r.id === "1")!.class.expenseDelta, 100)
  assert.equal(rows.find((r) => r.id === "2")!.class.hide, true)
  assert.equal(rows.find((r) => r.id === "2")!.class.expenseDelta, 0)
  assert.equal(rows.find((r) => r.id === "3")!.class.hide, true)
})

test("CDB redemption is an internal transfer", () => {
  const c = classifyTransaction({
    description: "Resgate CDB",
    amount: 5000,
    source_type: "checking",
  })
  assert.equal(c.kind, "investment_transfer")
  assert.equal(c.isIncome, false)
  assert.equal(c.isExpense, false)
})

test("pending notes surface as pending", () => {
  const c = classifyTransaction({
    description: "Padaria",
    amount: -20,
    source_type: "credit_card",
    notes: "pending",
  })
  assert.equal(c.pending, true)
})
