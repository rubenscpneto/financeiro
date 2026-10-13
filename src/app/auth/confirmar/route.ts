import { type EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"
import { getSiteUrl } from "@/lib/site-url"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // Behind a reverse proxy request.url carries the internal bind address,
  // so build redirects from the configured public site URL.
  const origin = getSiteUrl()
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/painel"
  const safeNext = next.startsWith("/") ? next : "/painel"

  const supabase = await createClient()

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?erro=confirmacao`)
}
