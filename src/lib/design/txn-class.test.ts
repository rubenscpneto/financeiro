import assert from "node:assert/strict"
import test from "node:test"
import {
  UNCLASSIFIED_FILTER,
  UNCLASSIFIED_PIX_MIN,
  classifyTransaction,
  decorateTransactions,
  displayCategoryLabel,
  groupRowsByDateDesc,
  isUnclassifiedRow,
  matchesCategoryFilter,
  matchesFlowFilter,
  showLoansBlock,
  spendCategoryId,
  summarizeFlow,
  sumSpending,
} from "../txn-class.ts"
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
  assert.equal(categoryLabelPt("Accommodation"), "Hospedagem")
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
    accountIdsForBank(groups, "c6")?.sort(),
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

test("card Transfers purchases count as spending, including IOF", () => {
  const c = classifyTransaction({
    description: "Subscription",
    amount: -20,
    source_type: "credit_card",
    source_category: "Transfers",
    is_transfer: true,
  })
  assert.equal(c.isExpense, true)
  assert.equal(c.kind, "expense")
  assert.equal(c.expenseDelta, 20)

  const rows = decorateTransactions(
    [
      {
        id: "sub",
        date: "2026-09-04",
        account_id: "card",
        description: "Subscription",
        amount: -20,
        source_type: "credit_card",
        source_category: "Transfers",
        is_transfer: true,
      },
      {
        id: "iof",
        date: "2026-09-04",
        account_id: "card",
        description: "IOF",
        amount: -0.7,
        source_type: "credit_card",
      },
    ],
    { yearMonth: "2026-09" }
  )
  const sub = rows.find((r) => r.id === "sub")!
  const iof = rows.find((r) => r.id === "iof")!
  assert.equal(iof.class.hide, true)
  assert.equal(sub.class.expenseDelta, 20.7)
})

test("checking debits count as spending except bill, CDB, and own-account transfers", () => {
  const food = classifyTransaction({
    description: "Padaria",
    amount: -32.9,
    source_type: "checking",
    source_category: "Food and drinks",
  })
  assert.equal(food.isExpense, true)

  const service = classifyTransaction({
    description: "Payment processor",
    amount: -15,
    source_type: "checking",
    source_category: "Services",
    is_transfer: true,
  })
  assert.equal(service.isExpense, true)

  const pix = classifyTransaction({
    description: "Pix",
    amount: -50,
    source_type: "checking",
    is_transfer: true,
  })
  assert.equal(pix.isExpense, true)
  assert.equal(pix.categoryLabel, "A classificar")

  const bill = classifyTransaction({
    description: "Pagamento fatura cartão",
    amount: -1200,
    source_type: "checking",
  })
  assert.equal(bill.isExpense, false)

  const cdb = classifyTransaction({
    description: "Aplicação CDB",
    amount: -5000,
    source_type: "checking",
  })
  assert.equal(cdb.isExpense, false)

  const own = classifyTransaction({
    description: "Pix",
    amount: -200,
    source_type: "checking",
    source_category: "Same Person Transfer",
    is_transfer: true,
  })
  assert.equal(own.isExpense, false)
  assert.equal(own.kind, "transfer")
})

test("A classificar spends until the user marks Empréstimo", () => {
  const open = classifyTransaction({
    description: "Pix",
    amount: -80,
    source_type: "checking",
    is_transfer: true,
    date: "2026-09-12",
  })
  assert.equal(open.isExpense, true)
  assert.equal(open.kind, "expense")
  assert.equal(open.categoryLabel, "A classificar")

  const loan = classifyTransaction({
    description: "Pix",
    amount: -80,
    source_type: "checking",
    is_transfer: true,
    category_name: "Empréstimos",
    date: "2026-09-12",
  })
  assert.equal(loan.isExpense, false)
  assert.equal(loan.kind, "loan")
  assert.equal(loan.categoryLabel, "Empréstimos")
})

test("unclassified outgoing Pix at or above the threshold is A classificar even with Transfer - PIX", () => {
  assert.equal(UNCLASSIFIED_PIX_MIN, 500)
  const big = classifyTransaction({
    description: "Pix",
    amount: -UNCLASSIFIED_PIX_MIN,
    source_type: "checking",
    source_category: "Transfer - PIX",
    is_transfer: true,
  })
  assert.equal(big.isExpense, true)
  assert.equal(big.kind, "expense")
  assert.equal(big.categoryLabel, "A classificar")

  const small = classifyTransaction({
    description: "Pix",
    amount: -(UNCLASSIFIED_PIX_MIN - 0.01),
    source_type: "checking",
    source_category: "Transfer - PIX",
    is_transfer: true,
    category_name: "Serviços",
  })
  assert.equal(small.isExpense, true)
  assert.equal(small.categoryLabel !== "A classificar", true)

  const overridden = classifyTransaction({
    description: "Pix",
    amount: -800,
    source_type: "checking",
    source_category: "Transfer - PIX",
    is_transfer: true,
    user_category_name: "Empréstimos",
  })
  assert.equal(overridden.kind, "loan")
  assert.equal(overridden.isExpense, false)
  assert.equal(overridden.categoryLabel, "Empréstimos")
})

test("installments a few days apart still count only the current parcela", () => {
  const rows = decorateTransactions(
    [
      {
        id: "1",
        date: "2026-10-05",
        account_id: "card",
        description: "Magazine Luiza",
        amount: -300,
        installment: "1/2",
        source_type: "credit_card",
      },
      {
        id: "2",
        date: "2026-10-12",
        account_id: "card",
        description: "Magazine Luiza",
        amount: -300,
        installment: "2/2",
        source_type: "credit_card",
      },
    ],
    { yearMonth: "2026-10" }
  )
  assert.equal(sumSpending(rows), 300)
  assert.equal(rows.find((r) => r.id === "2")!.class.hide, true)
})

test("A classificar is a category filter option", () => {
  assert.equal(UNCLASSIFIED_FILTER, "a-classificar")
  const pix = classifyTransaction({
    description: "Pix",
    amount: -UNCLASSIFIED_PIX_MIN,
    source_type: "checking",
    source_category: "Transfer - PIX",
  })
  assert.equal(pix.categoryLabel, "A classificar")
  assert.equal(
    matchesCategoryFilter({ class: pix, user_category_id: null, category_id: "x" }, UNCLASSIFIED_FILTER),
    true
  )
  assert.equal(
    matchesCategoryFilter({ class: pix, user_category_id: "loan", category_id: "x" }, UNCLASSIFIED_FILTER),
    false
  )
})

test("Sept 1/3 projects the current month parcela 2/3 into October spending", () => {
  const rows = decorateTransactions(
    [
      {
        id: "e1",
        date: "2026-09-15",
        account_id: "card",
        description: "Loja Eletro Teste",
        amount: -300,
        installment: "1/3",
        source_type: "credit_card",
      },
    ],
    { yearMonth: "2026-10" }
  )
  const visible = rows.filter((r) => !r.class.hide)
  assert.equal(sumSpending(rows), 300)
  assert.equal(visible.length, 1)
  assert.equal(visible[0].class.installmentLabel, "Parcela 2/3")
})

test("chip and A classificar filter use the same unclassified predicate", () => {
  const pharmacy = classifyTransaction({
    description: "Farmácia",
    amount: -42.5,
    source_type: "credit_card",
    source_category: "Health",
  })
  assert.equal(pharmacy.categoryLabel, "A classificar")
  assert.equal(displayCategoryLabel({ class: pharmacy }), "A classificar")
  assert.equal(isUnclassifiedRow({ class: pharmacy, user_category_id: null }), true)
  assert.equal(
    matchesCategoryFilter(
      { class: pharmacy, user_category_id: null, category_id: null },
      UNCLASSIFIED_FILTER
    ),
    true
  )
  assert.equal(spendCategoryId({ class: pharmacy, category_id: "health" }), null)
})

test("unclassified spend buckets to A classificar, not Outros", () => {
  const rows = decorateTransactions(
    [
      {
        id: "p",
        date: "2026-10-04",
        description: "Farmácia",
        amount: -80,
        source_type: "credit_card",
      },
      {
        id: "pix",
        date: "2026-10-08",
        description: "Pix Sicrano Exemplo",
        amount: -400,
        source_type: "checking",
        source_category: "Transfer - PIX",
      },
    ],
    { yearMonth: "2026-10" }
  )
  const keys = rows
    .filter((t) => !t.class.hide && t.class.countInCategory && t.class.expenseDelta)
    .map((t) => spendCategoryId(t) ?? t.class.categoryLabel ?? "Outros")
  assert.deepEqual(keys, ["A classificar", "A classificar"])
})

test("Saídas excludes own-account transfers and summary follows the filter", () => {
  const rows = decorateTransactions(
    [
      {
        id: "food",
        date: "2026-10-02",
        description: "Padaria",
        amount: -38.9,
        source_type: "checking",
        source_category: "Food",
        category_name: "Alimentação",
      },
      {
        id: "own",
        date: "2026-10-03",
        description: "Pix",
        amount: -800,
        source_type: "checking",
        source_category: "Same Person Transfer",
        is_transfer: true,
      },
      {
        id: "salary",
        date: "2026-10-05",
        description: "Salário",
        amount: 7500,
        source_type: "checking",
      },
    ],
    { yearMonth: "2026-10" }
  )
  const out = rows.filter((t) => matchesFlowFilter(t, "out"))
  assert.equal(out.some((t) => t.id === "own"), false)
  assert.equal(out.some((t) => t.id === "food"), true)
  const outSum = summarizeFlow(out)
  assert.equal(outSum.saiu, 38.9)
  assert.equal(outSum.entrou, 0)
  const inn = rows.filter((t) => matchesFlowFilter(t, "in"))
  assert.equal(inn.some((t) => t.id === "salary"), true)
  assert.equal(inn.some((t) => t.id === "own"), false)
  const inSum = summarizeFlow(inn)
  assert.equal(inSum.entrou, 7500)
  assert.equal(inSum.saiu, 0)
})

test("Saídas summary nets refunds and excludes Empréstimos via sumSpending", () => {
  const rows = decorateTransactions(
    [
      {
        id: "food",
        date: "2026-10-02",
        description: "Padaria",
        amount: -100,
        source_type: "credit_card",
        category_name: "Alimentação",
      },
      {
        id: "back",
        date: "2026-10-03",
        description: "Cashback Padaria",
        amount: 12.4,
        source_type: "credit_card",
      },
      {
        id: "loan",
        date: "2026-10-04",
        description: "Pix",
        amount: -150,
        source_type: "checking",
        user_category_name: "Empréstimos",
      },
    ],
    { yearMonth: "2026-10" }
  )
  assert.equal(sumSpending(rows), 87.6)
  const out = rows.filter((t) => matchesFlowFilter(t, "out"))
  assert.equal(out.some((t) => t.class.kind === "loan"), false)
  assert.equal(sumSpending(out), sumSpending(rows))
})

test("Empréstimos block hides when A classificar filter is on", () => {
  assert.equal(showLoansBlock(""), true)
  assert.equal(showLoansBlock(UNCLASSIFIED_FILTER), false)
})

test("extrato groups sort by date descending so future parcelas sit on top", () => {
  const groups = groupRowsByDateDesc([
    { id: "a", date: "2026-10-02" },
    { id: "b", date: "2026-10-15" },
    { id: "c", date: "2026-10-02T00:00:00" },
    { id: "d", date: "2026-10-13" },
  ])
  assert.deepEqual(
    groups.map(([day]) => day),
    ["2026-10-15", "2026-10-13", "2026-10-02"]
  )
  assert.deepEqual(
    groups[2][1].map((t) => t.id),
    ["a", "c"]
  )
})
