import assert from "node:assert/strict"
import test from "node:test"
import {
  accountIdsForBank,
  applyOwnBankTransfers,
  dedupeTransactions,
  groupAccountsByBank,
  pickBalanceAccountIds,
  resolveBank,
} from "../banks.ts"
import { decorateTransactions } from "../txn-class.ts"
import { categoryLabelPt } from "../pluggy-categories-pt.ts"
import { monthLabelPt } from "../format.ts"

test("MeuPluggy is never a bank; COMPE 336 and C6 merge into C6", () => {
  const groups = groupAccountsByBank([
    {
      id: "stale",
      institution: "C6",
      type: "checking",
      last4: "1234",
      updated_at: "2025-01-01",
    },
    {
      id: "proxy",
      institution: "MeuPluggy",
      name: "Conta corrente",
      type: "checking",
      last4: "1234",
      extra_meta: JSON.stringify({ transferNumber: "336/0001/998877-1" }),
      updated_at: "2026-10-01",
    },
  ])
  assert.equal(groups.length, 1)
  assert.equal(groups[0].name, "C6")
  assert.equal(groups[0].key, "c6")
  assert.equal(
    groups.some((g) => /pluggy/i.test(g.name) || g.key.includes("pluggy")),
    false
  )
  assert.deepEqual(accountIdsForBank(groups, "c6")?.sort(), ["proxy", "stale"])
})

test("resolveBank uses transferNumber COMPE, not aggregator connector name", () => {
  const bank = resolveBank({
    id: "a",
    institution: "Meu Pluggy",
    extra_meta: { transferNumber: "336/0001/1" },
  })
  assert.equal(bank.name, "C6")
  assert.equal(bank.key, "c6")
})

test("stale C6 item only fills gaps; Meu Pluggy is primary for balances", () => {
  const accounts = [
    {
      id: "stale-checking",
      institution: "C6 Bank",
      type: "checking" as const,
      last4: "1111",
      updated_at: "2025-01-01",
    },
    {
      id: "fresh-checking",
      institution: "MeuPluggy",
      type: "checking" as const,
      last4: "1111",
      extra_meta: JSON.stringify({ transferNumber: "336/0001/1" }),
      updated_at: "2026-10-01",
    },
    {
      id: "stale-card",
      institution: "C6",
      type: "credit_card" as const,
      last4: "9999",
      updated_at: "2025-01-01",
    },
  ]
  const groups = groupAccountsByBank(accounts)
  assert.equal(groups.length, 1)
  const ids = pickBalanceAccountIds(accounts, groups[0])
  assert.equal(ids.includes("fresh-checking"), true)
  assert.equal(ids.includes("stale-checking"), false)
  assert.equal(ids.includes("stale-card"), true)
})

test("duplicate transactions collapse by date+amount+normalized description", () => {
  const kept = dedupeTransactions(
    [
      {
        id: "old",
        account_id: "stale",
        date: "2026-09-10",
        amount: -42.5,
        description: "IFOOD *Pedido  ",
      },
      {
        id: "new",
        account_id: "fresh",
        date: "2026-09-10",
        amount: -42.5,
        description: "ifood pedido",
      },
    ],
    { primaryAccountIds: new Set(["fresh"]) }
  )
  assert.equal(kept.length, 1)
  assert.equal(kept[0].id, "new")
})

test("filtered own-account transfer stays internal with Saiu/Veio labels", () => {
  const rows = decorateTransactions(
    [
      {
        id: "out",
        date: "2026-09-02",
        account_id: "c6-acc",
        description: "Pix",
        amount: -200,
        is_transfer: true,
        source_category: "Same Person Transfer",
      },
      {
        id: "in",
        date: "2026-09-02",
        account_id: "nu-acc",
        description: "Pix",
        amount: 200,
        is_transfer: true,
        source_category: "Same Person Transfer",
      },
    ],
    { yearMonth: "2026-09" }
  )
  const labeled = applyOwnBankTransfers(rows, {
    filteredBankKey: "c6",
    accountBankById: new Map([
      ["c6-acc", { key: "c6", name: "C6" }],
      ["nu-acc", { key: "nubank", name: "Nubank" }],
    ]),
  })
  const out = labeled.find((r) => r.id === "out")!
  assert.equal(out.class.isExpense, false)
  assert.equal(out.class.isIncome, false)
  assert.equal(out.class.displayLabel, "Saiu pro Nubank")
  const inn = labeled.find((r) => r.id === "in")!
  assert.equal(inn.class.displayLabel, "Veio do C6")
})

test("Accommodation maps to Hospedagem", () => {
  assert.equal(categoryLabelPt("Accommodation"), "Hospedagem")
  assert.equal(categoryLabelPt("Electronics"), "Eletrônicos")
  assert.equal(categoryLabelPt("Clothing"), "Vestuário")
})

test("month labels are 'Outubro de 2026'", () => {
  assert.equal(monthLabelPt("2026-10"), "Outubro de 2026")
})
