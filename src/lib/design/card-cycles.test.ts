import assert from "node:assert/strict"
import test from "node:test"
import {
  cycleForDate,
  cycleTotals,
  futureInstallments,
  itemsForCycle,
  type CardCycle,
} from "../card-cycles.ts"
import { decorateTransactions } from "../txn-class.ts"

const cycle: CardCycle = {
  dueYm: "2026-10",
  closeDate: "2026-10-07",
  dueDate: "2026-10-15",
  label: "outubro",
}

test("À vista is net purchases and bill payment stays out of the open cycle", () => {
  const txns = decorateTransactions([
    {
      id: "buy",
      date: "2026-09-20",
      account_id: "card",
      description: "Padaria",
      amount: -80,
      source_type: "credit_card",
    },
    {
      id: "credit",
      date: "2026-09-22",
      account_id: "card",
      description: "Estorno Padaria",
      amount: 20,
      source_type: "credit_card",
    },
    {
      id: "pay",
      date: "2026-09-25",
      account_id: "card",
      description: "Pagamento recebido",
      amount: 500,
      source_type: "credit_card",
    },
  ])
  const items = itemsForCycle(txns, "card", cycle, 7, 15)
  assert.equal(items.some((i) => i.id === "pay"), false)
  const totals = cycleTotals(items)
  assert.equal(totals.aVista, 60)
  assert.equal(totals.parcelas, 0)
  assert.equal(totals.net, 60)
})

test("October cycle shows parcela 2/3; future keeps only the remaining month", () => {
  const txns = decorateTransactions([
    {
      id: "e1",
      date: "2026-09-15",
      account_id: "card",
      description: "Loja Eletro Teste",
      amount: -300,
      installment: "1/3",
      source_type: "credit_card",
    },
  ])
  const oct = cycleForDate("2026-10-13", 20, 27)
  const items = itemsForCycle(txns, "card", oct, 20, 27)
  assert.equal(items.length, 1)
  assert.equal(items[0].installmentLabel, "Parcela 2 de 3")
  assert.equal(cycleTotals(items).parcelas, 300)
  assert.equal(cycleTotals(items).net, 300)
  const future = futureInstallments(txns, "card", oct.dueYm, 20, 27)
  assert.equal(future.length, 1)
  assert.equal(future[0].items[0].installmentLabel, "Parcela 3 de 3")
})

test("Fatura atual equals the sum of the cycle lines, not the snapshot", () => {
  const items = [
    {
      id: "a",
      date: "2026-10-01",
      name: "Padaria",
      amount: -80,
      category: null,
      installmentLabel: null,
      installmentCurrent: null,
      installmentTotal: null,
      remainingAfter: 0,
      subLine: null,
      isRefunded: false,
    },
    {
      id: "b",
      date: "2026-10-02",
      name: "Eletro",
      amount: -300,
      category: null,
      installmentLabel: "Parcela 2 de 3",
      installmentCurrent: 2,
      installmentTotal: 3,
      remainingAfter: 1,
      subLine: null,
      isRefunded: false,
    },
  ]
  const snapshot = 1072.25
  const totals = cycleTotals(items)
  const header = totals.net
  assert.equal(header, 380)
  assert.notEqual(header, snapshot)
})
