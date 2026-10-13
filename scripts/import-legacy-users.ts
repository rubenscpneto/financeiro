import { and, eq, sql } from "drizzle-orm"
import { db } from "../src/db"
import { account, profiles, user } from "../src/db/schema"

type LegacyRow = {
  id: string
  email: string
  encrypted_password: string | null
  email_confirmed_at: Date | string | null
  raw_user_meta_data: Record<string, unknown> | null
  created_at: Date | string | null
  updated_at: Date | string | null
}

function asDate(value: Date | string | null | undefined) {
  if (!value) return new Date()
  return value instanceof Date ? value : new Date(value)
}

function asRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows ?? []
  }
  return []
}

async function main() {
  const exists = asRows(
    await db.execute(sql`
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'legacy_auth_users'
      LIMIT 1
    `)
  )
  if (exists.length === 0) {
    console.log("public.legacy_auth_users not found; nothing to import")
    return
  }

  const rows = asRows<LegacyRow>(
    await db.execute(sql`
      SELECT id, email, encrypted_password, email_confirmed_at,
             raw_user_meta_data, created_at, updated_at
      FROM public.legacy_auth_users
    `)
  )

  let usersUpserted = 0
  let accountsUpserted = 0

  for (const row of rows) {
    const [profile] = await db
      .select({ nome: profiles.nome })
      .from(profiles)
      .where(eq(profiles.id, row.id))
      .limit(1)
    const name =
      profile?.nome?.trim() ||
      (typeof row.raw_user_meta_data?.nome === "string"
        ? row.raw_user_meta_data.nome
        : "") ||
      row.email

    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, row.id))
      .limit(1)

    if (!existingUser) {
      await db.insert(user).values({
        id: row.id,
        email: row.email,
        name,
        emailVerified: true,
        createdAt: asDate(row.created_at),
        updatedAt: asDate(row.updated_at),
      })
      usersUpserted += 1
    }

    const [existingAccount] = await db
      .select({ id: account.id })
      .from(account)
      .where(
        and(eq(account.userId, row.id), eq(account.providerId, "credential"))
      )
      .limit(1)

    if (!existingAccount) {
      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: row.id,
        providerId: "credential",
        userId: row.id,
        password: row.encrypted_password,
        createdAt: asDate(row.created_at),
        updatedAt: asDate(row.updated_at),
      })
      accountsUpserted += 1
    }
  }

  console.log(
    `legacy import done: ${usersUpserted} users, ${accountsUpserted} credential accounts (${rows.length} source rows)`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
