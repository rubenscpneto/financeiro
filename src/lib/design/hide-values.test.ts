import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  hideValuesFromSearchParam,
  hiddenForHydration,
  hiddenFromStorageValue,
} from "./hide-values.ts"

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

describe("hiddenFromStorageValue", () => {
  it("reveals only the stored 0 flag", () => {
    assert.equal(hiddenFromStorageValue("0"), false)
    assert.equal(hiddenFromStorageValue("1"), true)
    assert.equal(hiddenFromStorageValue(null), true)
    assert.equal(hiddenFromStorageValue(undefined), true)
  })
})

describe("hiddenForHydration", () => {
  it("keeps the server snapshot until the consumer hydrates", () => {
    assert.equal(hiddenForHydration({ stored: "0", hydrated: false }), true)
    assert.equal(hiddenForHydration({ stored: "1", hydrated: false }), true)
  })

  it("applies localStorage only after hydration", () => {
    assert.equal(hiddenForHydration({ stored: "0", hydrated: true }), false)
    assert.equal(hiddenForHydration({ stored: "1", hydrated: true }), true)
    assert.equal(hiddenForHydration({ stored: null, hydrated: true }), true)
  })
})
