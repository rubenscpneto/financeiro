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
  "/configuracoes",
] as const

const VERSION_LINE = /^Versão (dev|[0-9a-f]{7,}) · (homologação|produção|local)$/

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

async function login(page: Page) {
  await page.goto("/auth/login")
  await page.getByLabel("E-mail").fill(EMAIL)
  await page.getByLabel("Senha").fill(PASSWORD)
  await page.getByRole("button", { name: "Entrar" }).click()
  await page.waitForURL(/\/painel/)
  await expect(page.getByText("Olá,")).toBeVisible()
}

async function assertAuthedPathsClean(page: Page, errors: string[]) {
  for (const path of AUTHED_PATHS) {
    const before = errors.length
    await page.goto(path, { waitUntil: "networkidle" })
    await page.waitForTimeout(500)
    expect(errors.slice(before), `hydration error on ${path}`).toEqual([])

    await expect(page.locator('meta[name="app-version"]')).toHaveCount(1)
    const version = page.getByText(VERSION_LINE)
    if (path === "/configuracoes") {
      await expect(version).toHaveCount(1)
      await expect(version).toBeVisible()
      await expect(version).toHaveClass(/text-sm/)
      await expect(version).toHaveClass(/text-ds-subtle/)
    } else {
      await expect(version).toHaveCount(0)
    }

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
        const vence: string[] = []
        const banners: string[] = []
        for (let i = 0; i < tabCount; i++) {
          await cycleTabs.nth(i).click()
          const label = page.getByText(/^vence \d{2}\/\d{2}$/)
          await expect(label).toBeVisible()
          vence.push((await label.textContent()) ?? "")
          const banner = page.getByText(
            /^Fatura vence( em \d{2}\/\d{2}|u há )/
          )
          await expect(banner).toBeVisible()
          banners.push((await banner.textContent()) ?? "")
        }
        expect(
          new Set(vence).size,
          `vence label should follow the selected cycle tab, got ${vence.join(", ")}`
        ).toBe(tabCount)
        expect(
          banners.length,
          `orange banner should render on every cycle tab, got ${banners.join(", ")}`
        ).toBe(tabCount)
        expect(
          new Set(banners).size,
          `orange banner should follow the selected cycle tab, got ${banners.join(", ")}`
        ).toBe(tabCount)
      }
    }
  }
  expect(errors, "hydration errors across authed pages").toEqual([])
}

test.describe("authenticated hydration", () => {
  test.use({
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  })

  test("authed pages emit no hydration errors with values revealed", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("financeiro-hide-values", "0")
      localStorage.setItem("theme", "dark")
    })
    const errors = collectHydrationErrors(page)
    await login(page)
    await assertAuthedPathsClean(page, errors)
  })

  test("authed pages emit no hydration errors with values hidden", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("financeiro-hide-values", "1")
      localStorage.removeItem("theme")
    })
    const errors = collectHydrationErrors(page)
    await login(page)
    await assertAuthedPathsClean(page, errors)
  })
})
