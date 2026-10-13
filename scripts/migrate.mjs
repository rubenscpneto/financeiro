import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../drizzle"
)

const sql = postgres(url, { max: 1, prepare: false })
try {
  await migrate(drizzle(sql), { migrationsFolder })
  console.log("drizzle migrations applied")
} finally {
  await sql.end({ timeout: 5 })
}
