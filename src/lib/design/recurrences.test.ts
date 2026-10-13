import assert from "node:assert/strict"
import test from "node:test"
import { detectRecurrences, recurringMonthlySpend } from "../recurrences.ts"

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

test("groceries repeating across months are not recurring spend", () => {
  const txns = [
    {
      id: "m1",
      date: "2026-09-04",
      amount: -312.45,
      merchant: "Mercado Teste",
      description: "Mercado Teste",
      source_type: "credit_card" as const,
      source_category: "Food",
    },
    {
      id: "m2",
      date: "2026-10-04",
      amount: -312.45,
      merchant: "Mercado Teste",
      description: "Mercado Teste",
      source_type: "credit_card" as const,
      source_category: "Food",
    },
    {
      id: "p1",
      date: "2026-09-08",
      amount: -38.9,
      merchant: "Padaria",
      description: "Padaria",
      source_type: "credit_card" as const,
      category_name: "Alimentação",
    },
    {
      id: "p2",
      date: "2026-10-08",
      amount: -38.9,
      merchant: "Padaria",
      description: "Padaria",
      source_type: "credit_card" as const,
      category_name: "Alimentação",
    },
    {
      id: "n1",
      date: "2026-09-10",
      amount: -55.9,
      merchant: "Streaming",
      description: "Streaming",
      source_type: "credit_card" as const,
    },
    {
      id: "n2",
      date: "2026-10-10",
      amount: -55.9,
      merchant: "Streaming",
      description: "Streaming",
      source_type: "credit_card" as const,
    },
  ]
  assert.equal(recurringMonthlySpend(txns, "2026-10", 3), 55.9)
})

test("detectRecurrences skips groceries, IOF, Pix to a person, and installments", () => {
  const { series } = detectRecurrences(
    [
      {
        id: "g1",
        date: "2026-09-04",
        amount: -312.45,
        merchant: "Mercado Teste",
        description: "Mercado Teste",
        source_type: "credit_card",
        source_category: "Food",
      },
      {
        id: "g2",
        date: "2026-10-04",
        amount: -312.45,
        merchant: "Mercado Teste",
        description: "Mercado Teste",
        source_type: "credit_card",
        source_category: "Food",
      },
      {
        id: "iof1",
        date: "2026-09-05",
        amount: -3.85,
        description: "IOF",
        source_type: "credit_card",
      },
      {
        id: "iof2",
        date: "2026-10-05",
        amount: -3.85,
        description: "IOF",
        source_type: "credit_card",
      },
      {
        id: "pix1",
        date: "2026-09-06",
        amount: -25,
        description: "Pix Ciclano",
        source_type: "checking",
        source_category: "Transfer - PIX",
      },
      {
        id: "pix2",
        date: "2026-10-06",
        amount: -25,
        description: "Pix Ciclano",
        source_type: "checking",
        source_category: "Transfer - PIX",
      },
      {
        id: "parc1",
        date: "2026-09-15",
        amount: -300,
        description: "Loja Eletro Teste",
        installment: "1/3",
        source_type: "credit_card",
      },
      {
        id: "parc2",
        date: "2026-10-15",
        amount: -300,
        description: "Loja Eletro Teste",
        installment: "2/3",
        source_type: "credit_card",
      },
      {
        id: "s1",
        date: "2026-09-10",
        amount: -110,
        merchant: "Software",
        description: "Software",
        source_type: "credit_card",
      },
      {
        id: "s2",
        date: "2026-10-10",
        amount: -110,
        merchant: "Software",
        description: "Software",
        source_type: "credit_card",
      },
    ],
    "2026-10-13"
  )
  assert.deepEqual(
    series.map((s) => s.name).sort(),
    ["Software"]
  )
  assert.equal(series[0].monthly, 110)
})
