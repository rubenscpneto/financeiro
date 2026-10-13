import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { hideValuesFromSearchParam } from "./hide-values.ts"

describe("hideValuesFromSearchParam", () => {
  it("hides by default", () => {
    assert.equal(hideValuesFromSearchParam(undefined), true)
    assert.equal(hideValuesFromSearchParam("1"), true)
    assert.equal(hideValuesFromSearchParam(""), true)
  })

  it("reveals only when hidden=0", () => {
    assert.equal(hideValuesFromSearchParam("0"), false)
  })
})
