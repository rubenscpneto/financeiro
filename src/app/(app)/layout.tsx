import { Suspense } from "react"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { accounts, profiles } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { decAccount } from "@/lib/crypto/rows"
import { groupAccountsByBank } from "@/lib/banks"
import { AppProviders } from "@/components/app-providers"
import { AppShell } from "@/components/app-shell"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, user } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)

  const [profile, accountRows] = await Promise.all([
    db
      .select({ nome: profiles.nome })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select()
      .from(accounts)
      .where(and(eq(accounts.user_id, userId), eq(accounts.is_active, true))),
  ])

  const nome = crypto.decryptFlex("nome", profile?.nome ?? null)
  const label = nome || user.email || "Usuário"
  const banks = groupAccountsByBank(accountRows.map((a) => decAccount(crypto, a)))

  return (
    <AppProviders>
      <Suspense>
        <AppShell
          userLabel={label}
          banks={banks.map((b) => ({ key: b.key, name: b.name }))}
        >
          {children}
        </AppShell>
      </Suspense>
    </AppProviders>
  )
}
