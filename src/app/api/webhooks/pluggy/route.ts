import { after, NextResponse } from "next/server"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { resolvePluggyItemId } from "@/lib/pluggy/item-store"

export const runtime = "nodejs"
export const maxDuration = 300

type PluggyWebhookBody = {
  event?: string
  eventId?: string
  itemId?: string
  triggeredBy?: string
}

function authorize(req: Request): boolean {
  const secret = process.env.PLUGGY_WEBHOOK_SECRET
  if (!secret) return false
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

function shouldSync(event: string | undefined): boolean {
  return event === "item/updated" || event === "item/created"
}

/**
 * Pluggy notifies when an Item finishes syncing. Respond 2xx fast, then pull
 * data via runPluggySync (investments, accounts, txns).
 */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: PluggyWebhookBody
  try {
    body = (await req.json()) as PluggyWebhookBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const event = body.event
  const itemId = body.itemId

  if (!shouldSync(event)) {
    return NextResponse.json({ ok: true, ignored: event ?? "unknown" })
  }

  const userId = process.env.PLUGGY_SYNC_USER_ID
  if (!userId) {
    return NextResponse.json(
      { error: "Missing PLUGGY_SYNC_USER_ID" },
      { status: 500 }
    )
  }

  let expectedItemId: string
  try {
    const crypto = await getOrCreateUserCrypto(userId)
    expectedItemId = await resolvePluggyItemId(crypto)
  } catch {
    return NextResponse.json(
      { error: "Missing PLUGGY_ITEM_ID" },
      { status: 500 }
    )
  }

  if (!itemId || itemId !== expectedItemId) {
    return NextResponse.json({
      ok: true,
      ignored: "itemId mismatch",
    })
  }

  after(async () => {
    try {
      const { runPluggySync } = await import("@/lib/pluggy/sync")
      const result = await runPluggySync(userId)
      if (result.error) {
        console.error("[pluggy webhook] sync failed", result.error)
      } else {
        console.info("[pluggy webhook] sync ok", {
          event,
          eventId: body.eventId,
          triggeredBy: body.triggeredBy,
          ...result,
        })
      }
    } catch (e) {
      console.error(
        "[pluggy webhook] sync threw",
        e instanceof Error ? e.message : e
      )
    }
  })

  return NextResponse.json({ ok: true, queued: true, event })
}
