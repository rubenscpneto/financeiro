import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { goals } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { MetasClient } from "@/components/metas-client"
import type { Goal } from "@/lib/types"

export default async function MetasPage() {
  const { userId } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)
  const data = await db
    .select()
    .from(goals)
    .where(eq(goals.user_id, userId))
    .orderBy(desc(goals.created_at), desc(goals.id))

  const mapped = data.map((g) => ({
    ...g,
    name: crypto.decryptFlex("name", g.name) ?? g.name,
    target_amount: crypto.decryptNum("target_amount", g.target_amount),
    current_amount: crypto.decryptNum("current_amount", g.current_amount),
  }))

  return <MetasClient goals={mapped as Goal[]} />
}
