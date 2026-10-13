import { eq } from "drizzle-orm"
import { db } from "@/db"
import { profiles } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { AppProviders } from "@/components/app-providers"
import { AppShell } from "@/components/app-shell"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, user } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)

  const [profile] = await db
    .select({ nome: profiles.nome })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)

  const nome = crypto.decryptFlex("nome", profile?.nome ?? null)
  const label = nome || user.email || "Usuário"

  return (
    <AppProviders>
      <AppShell userLabel={label}>{children}</AppShell>
    </AppProviders>
  )
}
