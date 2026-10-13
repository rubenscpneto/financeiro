/**
 * Idempotent backfill: encrypt leftover plaintext after 0002_encryption_expand.
 *
 * BEFORE running: dump Postgres AND copy the KEK file to offline storage
 * (not the same disk as the DB backup).
 *
 *   KEK_FILE=/run/secrets/financeiro_kek DATABASE_URL=... npx tsx scripts/encrypt-existing-data.ts
 *   KEK_FILE=... DATABASE_URL=... npx tsx scripts/encrypt-existing-data.ts --verify
 */
import { db, sql as pg } from "@/db"
import { user } from "@/db/schema"
import { reencryptUserData, verifyUserEncrypted } from "@/lib/crypto/reencrypt-user"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"

const verify = process.argv.includes("--verify")

async function main() {
  if (!process.env.KEK_FILE) {
    console.error("KEK_FILE is required")
    process.exit(1)
  }
  const users = await db.select({ id: user.id, email: user.email }).from(user)
  let leftover = 0
  for (const u of users) {
    const crypto = await getOrCreateUserCrypto(u.id)
    if (verify) {
      const bad = await verifyUserEncrypted(crypto)
      if (bad.length) {
        leftover += bad.length
        console.error(`${u.email}: ${bad.length} plaintext fields`)
        for (const line of bad.slice(0, 20)) console.error("  ", line)
      } else {
        console.log(`${u.email}: encrypted`)
      }
      continue
    }
    const stats = await reencryptUserData(crypto, crypto, "backfill")
    console.log(
      `${u.email}: updated=${stats.updated} skipped=${stats.skipped} files=${stats.filesEncrypted}`
    )
  }
  if (verify && leftover > 0) {
    process.exit(1)
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
