/**
 * Destroy a user's DEK (and statement files). Ciphertext becomes unreadable.
 *
 *   KEK_FILE=... DATABASE_URL=... npx tsx scripts/destroy-user-dek.ts <user-uuid>
 */
import { rm } from "node:fs/promises"
import path from "node:path"
import { sql as pg } from "@/db"
import { destroyUserDek } from "@/lib/crypto/user-keys"
import { storageRoot } from "@/lib/storage"

async function main() {
  const userId = process.argv[2]
  if (!userId) {
    console.error("Usage: tsx scripts/destroy-user-dek.ts <user-uuid>")
    process.exit(1)
  }
  await destroyUserDek(userId)
  const dir = path.join(storageRoot(), userId)
  await rm(dir, { recursive: true, force: true })
  console.log(`Destroyed DEK and files for ${userId}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await pg.end({ timeout: 5 })
  })
