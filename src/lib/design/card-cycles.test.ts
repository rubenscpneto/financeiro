import assert from "node:assert/strict"
import test from "node:test"
import {
  cycleTotals,
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
