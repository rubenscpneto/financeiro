import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")
const css = readFileSync(join(root, "design/tokens.css"), "utf8")

function block(selector: string) {
  const idx = css.indexOf(selector)
  assert.ok(idx >= 0, `missing selector ${selector}`)
  const start = css.indexOf("{", idx)
  const end = css.indexOf("}", start)
  return css.slice(start, end)
}

describe("design tokens", () => {
  it("defines light theme hex values from the spec", () => {
    const light = block(":root")
    assert.match(light, /--ds-bg:\s*#F5F6F2/i)
    assert.match(light, /--ds-primary:\s*#1E6B47/i)
    assert.match(light, /--ds-primary-deep:\s*#0F3A27/i)
  })

  it("defines dark theme hex values from the spec", () => {
    const dark = block(".dark")
    assert.match(dark, /--ds-bg:\s*#0B0B0C/i)
    assert.match(dark, /--ds-surface:\s*#161618/i)
    assert.match(dark, /--ds-elevated:\s*#1C1C1F/i)
    assert.match(dark, /--ds-border:\s*#2C2C30/i)
    assert.match(dark, /--ds-ink:\s*#F2F2F3/i)
    assert.match(dark, /--ds-muted:\s*#B8B8BE/i)
    assert.match(dark, /--ds-subtle:\s*#9D9DA4/i)
    assert.match(dark, /--ds-btn:\s*#5FD394/i)
    assert.match(dark, /--ds-on-btn:\s*#05200F/i)
    assert.match(dark, /--ds-accent:\s*#5FD394/i)
    assert.match(dark, /--ds-pos:\s*#5FD394/i)
  })
})
