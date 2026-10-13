import { eq } from "drizzle-orm"
import { db } from "@/db"
import { userKeys } from "@/db/schema"
import { deriveBlindIndexKey } from "./blind-index"
import { UserCrypto, generateDek } from "./codec"
import { getKeyProvider } from "./provider"

function packKeys(dek: Buffer, bidxKey: Buffer): Buffer {
  return Buffer.concat([dek, bidxKey])
}

function unpackKeys(packed: Buffer): { dek: Buffer; bidxKey: Buffer } {
  if (packed.length === 32) {
    return { dek: packed, bidxKey: deriveBlindIndexKey(packed) }
  }
  if (packed.length !== 64) {
    throw new Error("Unexpected wrapped key payload length")
  }
  return { dek: packed.subarray(0, 32), bidxKey: packed.subarray(32, 64) }
}

const dekMemo = new Map<string, UserCrypto>()

function cache(crypto: UserCrypto): UserCrypto {
  dekMemo.set(crypto.userId, crypto)
  return crypto
}

export function forgetUserDek(userId: string): void {
  dekMemo.delete(userId)
}

export async function getOrCreateUserCrypto(userId: string): Promise<UserCrypto> {
  const hit = dekMemo.get(userId)
  if (hit) return hit

  const provider = getKeyProvider()
  const [existing] = await db
    .select()
    .from(userKeys)
    .where(eq(userKeys.user_id, userId))
    .limit(1)

  if (existing) {
    const packed = await provider.unwrapDek(
      existing.wrapped_dek,
      existing.kek_version,
      userId
    )
    const keys = unpackKeys(packed)
    return cache(new UserCrypto(userId, keys.dek, "1", keys.bidxKey))
  }

  const dek = generateDek()
  const bidxKey = deriveBlindIndexKey(dek)
  const wrapped = await provider.wrapDek(packKeys(dek, bidxKey), userId)
  try {
    await db.insert(userKeys).values({
      user_id: userId,
      wrapped_dek: wrapped.wrapped,
      kek_version: wrapped.kekVersion,
    })
  } catch {
    const [raced] = await db
      .select()
      .from(userKeys)
      .where(eq(userKeys.user_id, userId))
      .limit(1)
    if (!raced) throw new Error("Failed to persist user DEK")
    const racedPacked = await provider.unwrapDek(
      raced.wrapped_dek,
      raced.kek_version,
      userId
    )
    const racedKeys = unpackKeys(racedPacked)
    return cache(new UserCrypto(userId, racedKeys.dek, "1", racedKeys.bidxKey))
  }
  return cache(new UserCrypto(userId, dek, "1", bidxKey))
}

export { packKeys, unpackKeys }

/** Destroy the user's DEK. Remaining ciphertext is unreadable. */
export async function destroyUserDek(userId: string): Promise<void> {
  forgetUserDek(userId)
  await db.delete(userKeys).where(eq(userKeys.user_id, userId))
}

export async function persistPackedKeys(
  userId: string,
  packed: Buffer
): Promise<void> {
  const provider = getKeyProvider()
  const wrapped = await provider.wrapDek(packed, userId)
  await db
    .insert(userKeys)
    .values({
      user_id: userId,
      wrapped_dek: wrapped.wrapped,
      kek_version: wrapped.kekVersion,
    })
    .onConflictDoUpdate({
      target: userKeys.user_id,
      set: {
        wrapped_dek: wrapped.wrapped,
        kek_version: wrapped.kekVersion,
      },
    })
  forgetUserDek(userId)
}
