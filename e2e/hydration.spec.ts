import { expect, test, type ConsoleMessage, type Page } from "@playwright/test"

const EMAIL = process.env.E2E_EMAIL ?? "qa-local@example.com"
const PASSWORD = process.env.E2E_PASSWORD ?? "qa-local-pass"

const AUTHED_PATHS = [
  "/painel",
  "/transacoes",
  "/fatura",
  "/orcamentos",
  "/metas",
  "/investimentos",
] as const

function isHydrationNoise(text: string) {
  return (
    /hydrat/i.test(text) ||
    /Minified React error #418/.test(text) ||
    /Minified React error #423/.test(text) ||
    /Minified React error #425/.test(text) ||
    /did not match/.test(text) ||
    /server rendered HTML didn't match/i.test(text)
  )
}

function collectHydrationErrors(page: Page) {
  const errors: string[] = []
  page.on("pageerror", (err) => {
    const text = String(err?.message ?? err)
    if (isHydrationNoise(text)) errors.push(`pageerror: ${text}`)
  })
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return
    const text = msg.text()
    if (isHydrationNoise(text)) errors.push(`console: ${text}`)
  })
  return errors
}

test.describe("authenticated hydration", () => {
  test.use({
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  })

  test("login then authed pages emit no React hydration errors", async ({
    page,
  }) => {
    // Staging QA stores revealed values. SSR still defaults to hidden, so this
    // must be set before the first authed document load or the test is a false pass.
    await page.addInitScript(() => {
      localStorage.setItem("financeiro-hide-values", "0")
      localStorage.setItem("theme", "dark")
    })

    const errors = collectHydrationErrors(page)

    await page.goto("/auth/login")
    await page.getByLabel("E-mail").fill(EMAIL)
    await page.getByLabel("Senha").fill(PASSWORD)
    await page.getByRole("button", { name: "Entrar" }).click()
    await page.waitForURL(/\/painel/)
    await expect(page.getByText("Olá,")).toBeVisible()

    for (const path of AUTHED_PATHS) {
      const before = errors.length
      await page.goto(path, { waitUntil: "networkidle" })
      await page.waitForTimeout(500)
      const added = errors.slice(before)
      expect(added, `hydration error on ${path}`).toEqual([])

      if (path === "/fatura") {
        const reloadBefore = errors.length
        await page.reload({ waitUntil: "networkidle" })
        await page.waitForTimeout(500)
        expect(
          errors.slice(reloadBefore),
          "hydration error on hard reload of /fatura"
        ).toEqual([])

        const cycleTabs = page.locator("div.inline-flex.rounded-full button")
        const tabCount = await cycleTabs.count()
        if (tabCount > 1) {
          const labels: string[] = []
          for (let i = 0; i < tabCount; i++) {
            await cycleTabs.nth(i).click()
            const label = page.getByText(/^vence \d{2}\/\d{2}$/)
            await expect(label).toBeVisible()
            labels.push((await label.textContent()) ?? "")
          }
          expect(
            new Set(labels).size,
            `vence label should follow the selected cycle tab, got ${labels.join(", ")}`
          ).toBe(tabCount)
        }
      }
    }

    expect(errors, "hydration errors across authed pages").toEqual([])
  })
})
