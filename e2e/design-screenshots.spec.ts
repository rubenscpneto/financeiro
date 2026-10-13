import { expect, test } from "@playwright/test"
import { mkdirSync } from "node:fs"

const outDir = "design/screenshots"

const views = [
  { view: "inicio", theme: "escuro", width: 390, height: 844 },
  { view: "inicio", theme: "claro", width: 390, height: 844 },
  { view: "inicio", theme: "escuro", width: 1440, height: 900 },
  { view: "inicio", theme: "claro", width: 1440, height: 900 },
  { view: "configuracoes", theme: "escuro", width: 390, height: 844 },
  { view: "configuracoes", theme: "claro", width: 390, height: 844 },
  { view: "configuracoes", theme: "escuro", width: 1440, height: 900 },
  { view: "configuracoes", theme: "claro", width: 1440, height: 900 },
] as const

function fileName(v: (typeof views)[number]) {
  const screen = v.view === "inicio" ? "inicio" : "configuracoes"
  const size = v.width === 390 ? "mobile-390" : "desktop-1440"
  return `${screen}-${size}-${v.theme}.png`
}

test.beforeAll(() => {
  mkdirSync(outDir, { recursive: true })
})

for (const v of views) {
  test(`${v.view} ${v.theme} ${v.width}`, async ({ page }) => {
    await page.setViewportSize({ width: v.width, height: v.height })
    await page.goto(
      `/design?view=${v.view}&theme=${v.theme}&size=${v.width}`
    )

    if (v.view === "inicio") {
      await expect(page.getByText("Olá, Rubens")).toBeVisible()
      await expect(page.getByText("Quanto você tem")).toBeVisible()
      await expect(page.getByText("Avisos de hoje")).toBeVisible()
      await expect(page.getByText("Limites de outubro")).toBeVisible()
    } else {
      await expect(
        page.getByRole("heading", { name: "Configurações" })
      ).toBeVisible()
      await expect(page.getByText("Teto por categoria")).toBeVisible()
      await expect(
        page.getByText("Começar com valores escondidos")
      ).toBeVisible()
      await expect(page.getByText("Envelope")).toBeVisible()
    }

    await page.screenshot({
      path: `${outDir}/${fileName(v)}`,
      fullPage: true,
    })
  })
}
