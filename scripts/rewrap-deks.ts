/**
 * KEK rotation: rewrap every DEK with a new KEK. Does not re-encrypt row data.
 *
 *   KEK_FILE=/run/secrets/financeiro_kek_new \
 *   KEK_FILE_OLD=/run/secrets/financeiro_kek_old \
 *   DATABASE_URL=... npx tsx scripts/rewrap-deks.ts
 *
 * Then point the app's KEK_FILE at the new secret and restart.
 */
import { eq } from "drizzle-orm"
import { db, sql as pg } from "@/db"
import { userKeys } from "@/db/schema"
import { FileKekProvider } from "@/lib/crypto/file-kek-provider"

async function main() {
  const oldPath = process.env.KEK_FILE_OLD
  const newPath = process.env.KEK_FILE
  if (!oldPath || !newPath) {
    console.error("KEK_FILE_OLD and KEK_FILE are required")
    process.exit(1)
  }
  const oldKek = new FileKekProvider(oldPath)
  const newKek = new FileKekProvider(newPath)
  const rows = await db.select().from(userKeys)
  let n = 0
  for (const row of rows) {
    const packed = await oldKek.unwrapDek(
      row.wrapped_dek,
      row.kek_version,
      row.user_id
    )
    const wrapped = await newKek.wrapDek(packed, row.user_id)
    await db
      .update(userKeys)
      .set({
        wrapped_dek: wrapped.wrapped,
        kek_version: wrapped.kekVersion,
      })
      .where(eq(userKeys.user_id, row.user_id))
    n += 1
  }
  console.log(`Rewrapped ${n} DEKs with KEK v${newKek.currentVersion()}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await pg.end({ timeout: 5 })
  })
