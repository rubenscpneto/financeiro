import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const globalForDb = globalThis as unknown as {
  __financeiroSql?: ReturnType<typeof postgres>
}

const url =
  process.env.DATABASE_URL ?? "postgres://127.0.0.1:5432/financeiro"

export const sql =
  globalForDb.__financeiroSql ??
  postgres(url, { max: 10, prepare: false, idle_timeout: 20 })

if (process.env.NODE_ENV !== "production") {
  globalForDb.__financeiroSql = sql
}

export const db = drizzle(sql, { schema })
