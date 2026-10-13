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

const STATUS_PT: Record<string, string> = {
  UPDATED: "Conectado",
  UPDATING: "Sincronizando",
  LOGIN_ERROR: "Erro de login — reconecte no Meu Pluggy",
  INVALID_CREDENTIALS: "Credenciais inválidas — reconecte",
  WAITING_USER_INPUT: "Aguardando autenticação",
  WAITING_USER_ACTION: "Aguardando ação no banco",
  OUTDATED: "Desatualizado — reconecte no Meu Pluggy",
}

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
    statusLabel: string
    detail: string | null
  } = {
    connected: false,
    institution: null,
    statusLabel: "Nenhuma conexão Open Finance",
    detail: "Conecte suas contas no Meu Pluggy e sincronize.",
  }

  try {
    const itemId = await resolvePluggyItemId(crypto)
    const apiKey = await getApiKey()
    const item = await fetchItem(apiKey, itemId)
    const ok = item.status === "UPDATED" || item.status === "UPDATING"
    pluggy = {
      connected: ok,
      institution: item.connector?.name ?? null,
      statusLabel: STATUS_PT[item.status] ?? `Status: ${item.status}`,
      detail: item.error?.message ?? item.executionStatus ?? null,
    }
  } catch (error) {
    pluggy = {
      connected: false,
      institution: null,
      statusLabel: "Open Finance indisponível",
      detail:
        error instanceof Error
          ? error.message
          : "Não foi possível consultar a conexão Pluggy.",
    }
  }

  return (
    <ConfiguracoesClient
      nome={nome}
      email={user.email ?? ""}
      pluggy={pluggy}
      settings={settings}
      bankCount={banks.length}
    />
  )
}
