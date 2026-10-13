import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  calendarDays,
  cdiPeriodReturn,
  holdingDays,
  iofOnEarnings,
  iofRate,
  irOnEarnings,
  irApplies,
  irBandLabel,
  irBandTotals,
  irRate,
  isCdbLocked,
  pctOfCdi,
  splitReserveNets,
  periodRendimento,
  rendimentoExcludingFlows,
  reservaLivre,
  reserveMonths,
  reserveProgress,
  reserveTarget,
  roundCents,
  titleNet,
  weightedContractedCdi,
} from "../money-math.ts"

describe("IOF regressive table", () => {
  it("uses 96% on day 1 and 0% from day 30", () => {
    assert.equal(iofRate(1), 0.96)
    assert.equal(iofRate(5), 0.83)
    assert.equal(iofRate(12), 0.6)
    assert.equal(iofRate(28), 0.06)
    assert.equal(iofRate(29), 0.03)
    assert.equal(iofRate(30), 0)
    assert.equal(iofRate(90), 0)
  })

  it("charges IOF on earnings and rounds to cents", () => {
    assert.equal(iofOnEarnings(16.5, 28), 0.99)
    assert.equal(iofOnEarnings(6.9, 12), 4.14)
    assert.equal(iofOnEarnings(1.2, 5), 1.0)
  })
})

describe("IR after IOF", () => {
  it("uses holding-day bands", () => {
    assert.equal(irRate(180), 0.225)
    assert.equal(irRate(181), 0.2)
    assert.equal(irRate(360), 0.2)
    assert.equal(irRate(361), 0.175)
    assert.equal(irRate(720), 0.175)
    assert.equal(irRate(721), 0.15)
  })

  it("taxes earnings minus IOF, then rounds to cents", () => {
    assert.equal(irOnEarnings(284.4, 5.13, 92), 62.84)
    assert.equal(irOnEarnings(886, 0, 200), 177.2)
    assert.equal(irOnEarnings(1218, 0, 600), 213.15)
    assert.equal(irOnEarnings(15, 1, 12), 3.15)
  })
})

describe("net value (IOF then IR)", () => {
  it("matches the CDB 102% group from spec §8", () => {
    const titles = [
      { gross: 1540.2, invested: 1448.2, days: 125 },
      { gross: 1502.1, invested: 1428.1, days: 104 },
      { gross: 1630.4, invested: 1566.4, days: 69 },
      { gross: 1480.3, invested: 1449.3, days: 41 },
      { gross: 1512.6, invested: 1496.1, days: 28 },
      { gross: 1518.8, invested: 1511.9, days: 12 },
    ]
    const nets = titles.map((t) => titleNet(t.gross, t.invested, t.days))
    const iof = roundCents(nets.reduce((s, n) => s + n.iof, 0))
    const ir = roundCents(nets.reduce((s, n) => s + n.ir, 0))
    const net = roundCents(nets.reduce((s, n) => s + n.net, 0))
    const earnings = roundCents(nets.reduce((s, n) => s + n.earnings, 0))
    assert.equal(earnings, 284.4)
    assert.equal(iof, 5.13)
    assert.equal(ir, 62.84)
    assert.equal(net, 9116.43)
  })

  it("hides IOF after 30 days", () => {
    const n = titleNet(7200, 6750, 250)
    assert.equal(n.iof, 0)
    assert.equal(n.ir, 90)
    assert.equal(n.net, 7110)
  })
})

describe("holding days and CDI", () => {
  it("counts calendar days between application and as-of", () => {
    assert.equal(calendarDays("2026-09-15", "2026-10-13"), 28)
    assert.equal(holdingDays("2026-10-01", "2026-10-13"), 12)
    assert.equal(holdingDays("2026-10-08", "2026-10-13"), 5)
  })

  it("compounds daily BCB series 12 factors", () => {
    const rates = Array(7).fill(0.04052)
    const month = cdiPeriodReturn(rates)
    assert.equal(roundCents(month * 100), 0.28)
    assert.ok(Math.abs(month - 0.00284) < 0.00001)

    const year = cdiPeriodReturn(Array(252).fill(0.04052))
    assert.equal(Number((year * 100).toFixed(2)), 10.75)
  })

  it("computes % CDI on average balance excluding flows", () => {
    const rendimento = rendimentoExcludingFlows({
      start: 31000,
      end: 31139.6,
      aportes: 50,
      resgates: 0,
    })
    assert.equal(roundCents(rendimento), 89.6)
    const pct = pctOfCdi(89.6, 31050, 0.00284)
    assert.equal(Number((pct * 100).toFixed(1)), 101.6)
  })

  it("does not treat principal applied in the period as yield", () => {
    const rendimento = periodRendimento({
      start: 0,
      end: 11000,
      movementAportes: 0,
      movementResgates: 0,
      principalApplied: 10000,
    })
    assert.equal(rendimento, 1000)
    const pct = pctOfCdi(1000, 10000, 0.1075)
    assert.ok(pct < 2)
  })

  it("IR bracket uses days since application, not maturity", () => {
    assert.equal(irBandLabel(holdingDays("2026-07-01", "2026-10-13")), "Até 180 dias")
    assert.equal(irBandLabel(holdingDays("2024-01-01", "2026-10-13")), "Mais de 720 dias")
  })

  it("weights contracted % CDI by gross value", () => {
    const avg = weightedContractedCdi([
      { gross: 9184.4, pctCdi: 102 },
      { gross: 14286, pctCdi: 101.5 },
      { gross: 6218, pctCdi: 100 },
      { gross: 1735, pctCdi: 100 },
    ])
    assert.equal(Number(avg.toFixed(1)), 101.3)
  })
})

describe("reserva livre", () => {
  it("is available today minus open card bills", () => {
    const livre = reservaLivre(24956.08, 1848.15)
    assert.equal(livre, 23107.93)
    assert.equal(reserveTarget(4850), 29100)
    assert.equal(Number(reserveMonths(livre, 4850).toFixed(1)), 4.8)
    assert.equal(Number((reserveProgress(livre, 29100) * 100).toFixed(1)), 79.4)
  })

  it("excludes a CDB locked until a far due date from liquid reserve", () => {
    const asOf = "2026-10-13"
    assert.equal(
      isCdbLocked({ name: "CDB prefixado", dueDate: "2031-05-20" }, asOf),
      true
    )
    assert.equal(
      isCdbLocked(
        { name: "CDB Liquidez diária", dueDate: "2028-01-10" },
        asOf
      ),
      false
    )
    const dailyNet = 5300
    const checking = 2000
    const openBill = 400
    const lockedNet = 12000
    const liquid = [lockedNet, dailyNet]
      .filter((_, i) =>
        i === 0
          ? !isCdbLocked({ name: "CDB prefixado", dueDate: "2031-05-20" }, asOf)
          : !isCdbLocked(
              { name: "CDB Liquidez diária", dueDate: "2028-01-10" },
              asOf
            )
      )
      .reduce((s, n) => s + n, 0)
    assert.equal(liquid, dailyNet)
    assert.equal(reservaLivre(liquid + checking, openBill), 6900)
  })

  it("flags excludeFromReserve titles as Fora da reserva", () => {
    const split = splitReserveNets([
      { net: 5300, locked: false, excludeFromReserve: false },
      { net: 12000, locked: true, excludeFromReserve: false },
      { net: 8000, locked: false, excludeFromReserve: true },
      { net: 1500, locked: true, excludeFromReserve: true },
    ])
    assert.equal(split.liquid, 5300)
    assert.equal(split.locked, 12000)
    assert.equal(split.excluded, 9500)
    assert.equal(reservaLivre(split.liquid + 2000, 400), 6900)
  })

  it("IR does not apply to daily-liquidity / come-cotas funds", () => {
    assert.equal(irApplies({ name: "CDB prefixado 2031" }), true)
    assert.equal(irApplies({ name: "CDB Liquidez diária" }), false)
    assert.equal(irApplies({ name: "Fundo DI come-cotas" }), false)
  })

  it("IR bands use holding-period rate on IR, not whole gross, and skip funds", () => {
    const bands = irBandTotals([
      { name: "CDB 2031", days: 330, ir: 180.31 },
      { name: "CDB curto", days: 90, ir: 10 },
      { name: "CDB Liquidez diária", days: 200, ir: 50 },
    ])
    assert.equal(bands.find((b) => b.label === "Até 180 dias")?.ir, 10)
    assert.equal(bands.find((b) => b.label === "181 a 360 dias")?.ir, 180.31)
    assert.equal(bands.find((b) => b.label === "361 a 720 dias")?.ir, 0)
  })

  it("Preso includes locked and Fora-da-reserva nets", () => {
    const split = splitReserveNets([
      { net: 5300, locked: false, excludeFromReserve: false },
      { net: 12000, locked: true, excludeFromReserve: false },
      { net: 5311.36, locked: true, excludeFromReserve: true },
    ])
    assert.equal(split.liquid, 5300)
    assert.equal(split.preso, 17311.36)
  })
})
