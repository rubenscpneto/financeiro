import assert from "node:assert/strict"
import test from "node:test"
import {
  cycleForDate,
  cycleTotals,
  faturaDueBanner,
  faturaHeaderTotal,
  faturaVenceLabel,
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

test("Fatura atual on the open cycle matches Início open-bill; other tabs follow cycle lines", () => {
  const openItems = [
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
  ]
  const nextItems = [
    {
      id: "b",
      date: "2026-11-15",
      name: "Eletro",
      amount: -300,
      category: null,
      installmentLabel: "Parcela 3 de 3",
      installmentCurrent: 3,
      installmentTotal: 3,
      remainingAfter: 1,
      subLine: null,
      isRefunded: false,
    },
  ]
  const openBill = 1072.25
  assert.equal(faturaHeaderTotal({ tab: 0, openBill, items: openItems }), 1072.25)
  assert.equal(faturaHeaderTotal({ tab: 1, openBill, items: nextItems }), 300)
})

test("vence label follows the selected cycle due date", () => {
  assert.equal(faturaVenceLabel("2026-11-05"), "vence 05/11")
  assert.equal(faturaVenceLabel("2026-12-05"), "vence 05/12")
  assert.equal(faturaVenceLabel("2027-01-05"), "vence 05/01")
  assert.equal(faturaVenceLabel(null), "aberta")
})

test("orange due banner follows the selected cycle due date", () => {
  assert.equal(
    faturaDueBanner({ dueDate: "2026-11-05", asOf: "2026-10-13" }).text,
    "Fatura vence em 05/11 (daqui a 23 dias)"
  )
  assert.equal(
    faturaDueBanner({ dueDate: "2026-12-05", asOf: "2026-10-13" }).text,
    "Fatura vence em 05/12 (daqui a 53 dias)"
  )
  assert.equal(
    faturaDueBanner({ dueDate: "2026-10-10", asOf: "2026-10-13" }).text,
    "Fatura venceu há 3 dias (10/10/2026)"
  )
  assert.equal(faturaDueBanner({ dueDate: "2026-10-16", asOf: "2026-10-13" }).soon, true)
  assert.equal(faturaDueBanner({ dueDate: null, asOf: "2026-10-13" }).kind, "none")
})

test("22:00 BRT on the last day of the month stays in that month's fatura cycle (UTC server)", () => {
  // 31 Oct 2026 22:00 BRT = 1 Nov 2026 01:00 UTC. Close on day 31 so
  // Oct 31 and Nov 1 land in different cycles.
  const fromYmd = cycleForDate("2026-10-31", 31, 10)
  const fromUtc = cycleForDate("2026-11-01T01:00:00.000Z", 31, 10)
  const fromBrt = cycleForDate("2026-10-31T22:00:00.000-03:00", 31, 10)
  assert.equal(fromUtc.dueYm, fromYmd.dueYm)
  assert.equal(fromBrt.dueYm, fromYmd.dueYm)
  assert.equal(fromUtc.closeDate.slice(0, 7), "2026-10")

  const txns = decorateTransactions([
    {
      id: "late",
      date: "2026-11-01T01:00:00.000Z",
      account_id: "card",
      description: "Padaria",
      amount: -50,
      source_type: "credit_card",
    },
  ])
  const items = itemsForCycle(txns, "card", fromYmd, 31, 10)
  assert.equal(items.length, 1)
  assert.equal(cycleTotals(items).net, 50)
})

test("future installments are sorted by date", () => {
  const txns = decorateTransactions([
    {
      id: "late",
      date: "2026-09-20",
      account_id: "card",
      description: "Loja B",
      amount: -50,
      installment: "1/3",
      source_type: "credit_card",
    },
    {
      id: "early",
      date: "2026-09-10",
      account_id: "card",
      description: "Loja A",
      amount: -80,
      installment: "1/3",
      source_type: "credit_card",
    },
  ])
  const oct = cycleForDate("2026-10-13", 20, 27)
  const future = futureInstallments(txns, "card", oct.dueYm, 20, 27)
  const dates = future.flatMap((g) => g.items.map((i) => i.date))
  assert.deepEqual(dates, [...dates].sort())
})
