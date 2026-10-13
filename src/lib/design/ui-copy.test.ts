import assert from "node:assert/strict"
import test from "node:test"
import { monthLabelPt } from "../format.ts"
import { formatBRLMasked } from "./money.ts"
import {
  EXTRATO_SUMMARY_NOTE,
  OPEN_FINANCE_CONNECTED,
  OPEN_FINANCE_RECONNECT,
  goalMonthlyPace,
  goalPaceCopy,
  openFinanceCopy,
} from "../ui-copy.ts"

test("Open Finance copy is Conectado + Reconectar, never raw SUCCESS", () => {
  const connected = openFinanceCopy({
    hasConnection: true,
    status: "UPDATED",
    executionStatus: "SUCCESS",
  })
  assert.equal(connected.statusLabel, "Conectado")
  assert.equal(connected.action, "Reconectar")
  assert.equal(connected.detail, null)
  assert.equal(connected.statusLabel.includes("SUCCESS"), false)
  assert.equal(connected.action.includes("SUCCESS"), false)
  assert.equal(OPEN_FINANCE_CONNECTED, "Conectado")
  assert.equal(OPEN_FINANCE_RECONNECT, "Reconectar")

  const down = openFinanceCopy({
    hasConnection: false,
    status: "SUCCESS",
    executionStatus: "SUCCESS",
  })
  assert.equal(down.statusLabel, null)
  assert.equal(down.action, "Reconectar")
  assert.equal(down.detail, null)
})

test("Orçamentos month at top is localized, not 2026-10", () => {
  assert.equal(monthLabelPt("2026-10"), "Outubro de 2026")
  assert.equal(monthLabelPt("2026-10").includes("2026-10"), false)
})

test("Extrato note is the exact pt-BR sentence", () => {
  assert.equal(
    EXTRATO_SUMMARY_NOTE,
    "Estornos e cashback diminuem o gasto. Ficam de fora o pagamento da fatura, as aplicações e resgates no CDB e as transferências entre suas contas. Empréstimos vão para 'a receber'."
  )
})

test("Metas pace sentence: on track vs needs more", () => {
  const money = (n: number) => formatBRLMasked(n, false)
  assert.equal(
    goalPaceCopy(200, 200, money),
    `Você guarda ${money(200)} por mês e está no ritmo certo pra chegar no prazo`
  )
  assert.equal(
    goalPaceCopy(100, 250, money),
    `Você guarda ${money(100)} por mês. Pra chegar no prazo, precisa guardar ${money(250)}.`
  )
})

test("goal monthly pace is saved so far vs remaining / months left", () => {
  const pace = goalMonthlyPace({
    current: 600,
    target: 1200,
    deadline: "2026-12-31",
    createdAt: "2026-07-13",
    asOf: new Date("2026-10-13T12:00:00-03:00"),
  })
  assert.equal(pace.savedPerMonth, 200)
  assert.equal(pace.requiredPerMonth, 300)
})
