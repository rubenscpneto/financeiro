import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user?.id) return null
  return session
}

export async function requireUser() {
  const session = await getSessionUser()
  if (!session) throw new Error("Não autenticado")
  return { userId: session.user.id, user: session.user, session }
}

export async function requireUserOrRedirect() {
  const session = await getSessionUser()
  if (!session) redirect("/auth/login")
  return { userId: session.user.id, user: session.user, session }
}
