import { after, NextResponse } from "next/server"
import { runPluggySync } from "@/lib/pluggy/sync"
import { createAdminClient } from "@/lib/supabase-admin"
import { getItemId } from "@/lib/pluggy/client"

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

  let expectedItemId: string
  try {
    expectedItemId = getItemId()
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

  const userId = process.env.PLUGGY_SYNC_USER_ID
  if (!userId) {
    return NextResponse.json(
      { error: "Missing PLUGGY_SYNC_USER_ID" },
      { status: 500 }
    )
  }

  // Ack immediately; Pluggy requires 2xx within 5s
  after(async () => {
    try {
      const supabase = createAdminClient()
      const result = await runPluggySync(supabase, userId)
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
