import { defineConfig } from "@playwright/test"

const port = Number(process.env.PORT ?? 3000)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    locale: "pt-BR",
  },
  webServer: {
    command: "npm run start",
    url: `${baseURL}/design`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      PORT: String(port),
      ALLOW_DESIGN_GALLERY: "true",
      CI: "true",
    },
  },
})
