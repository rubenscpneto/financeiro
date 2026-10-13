/**
 * DEK rotation: generate a new per-user DEK, re-encrypt all ciphertext, keep
 * the blind-index key so exact-match/dedup hashes stay valid.
 *
 *   KEK_FILE=/run/secrets/financeiro_kek DATABASE_URL=... npx tsx scripts/rotate-deks.ts
 */
import { db, sql as pg } from "@/db"
import { user } from "@/db/schema"
import { UserCrypto, generateDek } from "@/lib/crypto/codec"
import { reencryptUserData } from "@/lib/crypto/reencrypt-user"
import {
  getOrCreateUserCrypto,
  packKeys,
  persistPackedKeys,
} from "@/lib/crypto/user-keys"

async function main() {
  if (!process.env.KEK_FILE) {
    console.error("KEK_FILE is required")
    process.exit(1)
  }
  const users = await db.select({ id: user.id, email: user.email }).from(user)
  for (const u of users) {
    const oldCrypto = await getOrCreateUserCrypto(u.id)
    const newDek = generateDek()
    const newCrypto = new UserCrypto(u.id, newDek, "1", oldCrypto.bidxKey)
    const stats = await reencryptUserData(oldCrypto, newCrypto, "rotate")
    await persistPackedKeys(u.id, packKeys(newDek, oldCrypto.bidxKey))
    console.log(
      `${u.email}: rotated dek updated=${stats.updated} files=${stats.filesEncrypted}`
    )
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await pg.end({ timeout: 5 })
  })
