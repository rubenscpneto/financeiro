import assert from "node:assert/strict"
import test from "node:test"
import { classifyTransaction } from "../txn-class.ts"
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
