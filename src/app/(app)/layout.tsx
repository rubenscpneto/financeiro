import { eq } from "drizzle-orm"
import { db } from "@/db"
import { profiles } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { AppShell } from "@/components/app-shell"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, user } = await requireUserOrRedirect()

  const [profile] = await db
    .select({ nome: profiles.nome })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)

  const label = profile?.nome || user.email || "Usuário"

  return <AppShell userLabel={label}>{children}</AppShell>
}
