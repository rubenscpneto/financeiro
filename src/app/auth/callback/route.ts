import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"
import { getSiteUrl } from "@/lib/site-url"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // Behind a reverse proxy request.url carries the internal bind address,
  // so build redirects from the configured public site URL.
  const origin = getSiteUrl()
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/painel"
  const safeNext = next.startsWith("/") ? next : "/painel"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`)
}
