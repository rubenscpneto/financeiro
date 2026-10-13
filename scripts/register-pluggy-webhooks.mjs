/**
 * One-time: register Pluggy item/updated + item/created webhooks.
 *
 * Usage (from repo root, with .env.local loaded or env exported):
 *   node --env-file=.env.local scripts/register-pluggy-webhooks.mjs
 *
 * Requires: PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET, PLUGGY_WEBHOOK_SECRET,
 *           WEBHOOK_BASE_URL (public origin, no trailing slash)
 */
const PLUGGY_BASE = "https://api.pluggy.ai"

async function main() {
  const clientId = process.env.PLUGGY_CLIENT_ID
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET
  const webhookSecret = process.env.PLUGGY_WEBHOOK_SECRET
  const base = process.env.WEBHOOK_BASE_URL?.replace(/\/$/, "")

  if (!clientId || !clientSecret || !webhookSecret || !base) {
    console.error(
      "Missing PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET, PLUGGY_WEBHOOK_SECRET, or WEBHOOK_BASE_URL"
    )
    process.exit(1)
  }

  const authRes = await fetch(`${PLUGGY_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  })
  if (!authRes.ok) {
    console.error("Auth failed", await authRes.text())
    process.exit(1)
  }
  const { apiKey } = await authRes.json()
  if (!apiKey) {
    console.error("No apiKey in auth response")
    process.exit(1)
  }

  const url = `${base}/api/webhooks/pluggy`
  const headers = { Authorization: `Bearer ${webhookSecret}` }
  const events = ["item/updated", "item/created"]

  for (const event of events) {
    const res = await fetch(`${PLUGGY_BASE}/webhooks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ event, url, headers }),
    })
    const text = await res.text()
    if (res.ok) {
      console.log(`OK ${event} → ${url}`, text)
    } else if (res.status === 400 && text.includes("already exists")) {
      console.log(`SKIP ${event} (already exists)`)
    } else {
      console.error(`FAIL ${event}`, res.status, text)
      process.exitCode = 1
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
