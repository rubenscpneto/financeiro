import { eq } from "drizzle-orm"
import { db } from "@/db"
import { accounts, profiles } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { resolvePluggyItemId } from "@/lib/pluggy/item-store"
import { fetchItem, getApiKey } from "@/lib/pluggy/client"
import { loadUserSettings } from "@/lib/user-settings"
import { groupAccountsByBank } from "@/lib/banks"
import { decAccount } from "@/lib/crypto/rows"
import { ConfiguracoesClient } from "@/components/configuracoes-client"
import { openFinanceCopy } from "@/lib/ui-copy"
import { resolveAppVersionLine } from "@/lib/app-version"

export default async function ConfiguracoesPage() {
  const { userId, user } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)
  const settings = await loadUserSettings(crypto)

  const [profile] = await db
    .select({ nome: profiles.nome })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)

  const nome = crypto.decryptFlex("nome", profile?.nome ?? null) ?? ""
  const accountRows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.user_id, userId))
  const banks = groupAccountsByBank(accountRows.map((a) => decAccount(crypto, a)))

  let pluggy: {
    connected: boolean
    institution: string | null
    statusLabel: string | null
    action: string
  }
  try {
    const itemId = await resolvePluggyItemId(crypto)
    const apiKey = await getApiKey()
    const item = await fetchItem(apiKey, itemId)
    const copy = openFinanceCopy({
      hasConnection: true,
      status: item.status,
      executionStatus: item.executionStatus,
    })
    pluggy = {
      connected: true,
      institution: item.connector?.name ?? null,
      statusLabel: copy.statusLabel,
      action: copy.action,
    }
  } catch {
    const copy = openFinanceCopy({ hasConnection: false })
    pluggy = {
      connected: false,
      institution: null,
      statusLabel: copy.statusLabel,
      action: copy.action,
    }
  }

  return (
    <ConfiguracoesClient
      nome={nome}
      email={user.email ?? ""}
      pluggy={pluggy}
      settings={settings}
      bankCount={banks.length}
      versionLine={resolveAppVersionLine()}
    />
  )
}
