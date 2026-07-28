import { NextResponse } from "next/server"
import { runPluggySync } from "@/lib/pluggy/sync"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const maxDuration = 300

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  const url = new URL(req.url)
  return url.searchParams.get("secret") === secret
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = process.env.PLUGGY_SYNC_USER_ID
  if (!userId) {
    return NextResponse.json(
      { error: "Missing PLUGGY_SYNC_USER_ID" },
      { status: 500 }
    )
  }

  try {
    const supabase = createAdminClient()
    const result = await runPluggySync(supabase, userId)
    if (result.error) {
      return NextResponse.json(result, { status: 500 })
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    )
  }
}
