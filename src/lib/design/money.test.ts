import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { formatBRLMasked, maskMoneyInText } from "./money.ts"

describe("formatBRLMasked", () => {
  it("formats BRL when values are visible", () => {
    const out = formatBRLMasked(184320.55, false)
    assert.match(out, /R\$\s*184\.320,55/)
  })

  it("hides the amount when hidden is true", () => {
    assert.equal(formatBRLMasked(184320.55, true), "R$ ••••")
  })
})

describe("maskMoneyInText", () => {
  it("replaces every monetary value with the hidden placeholder", () => {
    const src =
      "Compra de −R$ 3.000,00. Pix +R$ 250,00. Saldo R$ 8.412,30."
    assert.equal(
      maskMoneyInText(src, true),
      "Compra de R$ ••••. Pix R$ ••••. Saldo R$ ••••."
    )
  })

  it("leaves text unchanged when not hidden", () => {
    const src = "Vence em 25 de outubro"
    assert.equal(maskMoneyInText(src, false), src)
    assert.equal(maskMoneyInText("−R$ 23,90", false), "−R$ 23,90")
  })
})
