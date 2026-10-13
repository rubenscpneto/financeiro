import { eq } from "drizzle-orm"
import { db } from "@/db"
import { pluggyConnections } from "@/db/schema"
import type { UserCrypto } from "@/lib/crypto/codec"
import { getItemId } from "@/lib/pluggy/client"

export async function resolvePluggyItemId(crypto: UserCrypto): Promise<string> {
  const [row] = await db
    .select()
    .from(pluggyConnections)
    .where(eq(pluggyConnections.user_id, crypto.userId))
    .limit(1)

  if (row) {
    const itemId = crypto.decryptFlex("item_id", row.item_id)
    if (!itemId) throw new Error("Stored Pluggy item id is empty")
    return itemId
  }

  let envId: string
  try {
    envId = getItemId()
  } catch {
    throw new Error("Configure PLUGGY_ITEM_ID (UUID do Item no Meu Pluggy).")
  }

  await db
    .insert(pluggyConnections)
    .values({
      user_id: crypto.userId,
      item_id: crypto.encrypt("item_id", envId),
    })
    .onConflictDoNothing({ target: pluggyConnections.user_id })

  return envId
}
