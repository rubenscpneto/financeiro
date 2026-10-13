import { type NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublicApi =
    path.startsWith("/api/cron/") ||
    path.startsWith("/api/webhooks/") ||
    path.startsWith("/api/auth/")
  const isAuthRoute = path.startsWith("/auth")
  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie && !isAuthRoute && !isPublicApi) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  const authBounceWhenLoggedIn =
    path === "/auth/login" ||
    path === "/auth/cadastro" ||
    path === "/auth/esqueci-senha"

  if (sessionCookie && authBounceWhenLoggedIn) {
    const url = request.nextUrl.clone()
    url.pathname = "/painel"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
