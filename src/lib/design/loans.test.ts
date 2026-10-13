import assert from "node:assert/strict"
import test from "node:test"
import { decorateTransactions } from "../txn-class.ts"
import { groupLoans, receivablesTotal } from "../loans.ts"

test("Empréstimos Pix is the same receivable on Extrato and Metas", () => {
  const rows = decorateTransactions([
    {
      id: "loan-1",
      date: "2026-09-12",
      description: "Pix",
      amount: -150,
      source_type: "checking",
      source_category: "Transfer - PIX",
      user_category_name: "Empréstimos",
    },
  ])
  const loans = groupLoans(rows, [])
  assert.equal(loans.length, 1)
  assert.equal(loans[0].remaining, 150)
  assert.equal(receivablesTotal(loans, []), 150)
})
