import assert from "node:assert/strict"
import test from "node:test"
import { recurringMonthlySpend } from "../recurrences.ts"

test("recurring spend is merchant in >=2 of last 3 months, not groceries or Pix", () => {
  const txns = [
    {
      id: "n1",
      date: "2026-08-10",
      amount: -49.9,
      merchant: "Netflix",
      description: "Netflix",
      source_type: "credit_card" as const,
    },
    {
      id: "n2",
      date: "2026-09-10",
      amount: -49.9,
      merchant: "Netflix",
      description: "Netflix",
      source_type: "credit_card" as const,
    },
    {
      id: "g1",
      date: "2026-10-02",
      amount: -220,
      merchant: "Supermercado",
      description: "Compras",
      source_type: "credit_card" as const,
    },
    {
      id: "pix",
      date: "2026-10-03",
      amount: -150,
      description: "Pix",
      source_type: "checking" as const,
      source_category: "Transfer - PIX",
    },
    {
      id: "iof",
      date: "2026-10-04",
      amount: -12,
      description: "IOF",
      source_type: "credit_card" as const,
    },
    {
      id: "parc",
      date: "2026-10-05",
      amount: -300,
      description: "Magazine",
      installment: "3/3",
      source_type: "credit_card" as const,
    },
  ]
  const monthly = recurringMonthlySpend(txns, "2026-10", 3)
  assert.equal(monthly, 49.9)
})
