import { hashPassword } from "better-auth/crypto"
import postgres from "postgres"

const url = process.env.DATABASE_URL
const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
const sql = postgres(url, { max: 1, prepare: false })
const userId = "11111111-1111-4111-8111-111111111111"
const c6Id = "22222222-2222-4222-8222-222222222222"
const nuId = "33333333-3333-4333-8333-333333333333"
const nuCard = "44444444-4444-4444-8444-444444444444"
const hash = await hashPassword(password)

await sql`DELETE FROM "user" WHERE email = ${email} OR id = ${userId}::uuid`
await sql`
  INSERT INTO "user" (id, name, email, email_verified)
  VALUES (${userId}::uuid, 'QA Local', ${email}, true)
`
await sql`
  INSERT INTO account (id, account_id, provider_id, user_id, password)
  VALUES (gen_random_uuid(), ${userId}, 'credential', ${userId}::uuid, ${hash})
`
await sql`
  INSERT INTO profiles (id, nome)
  VALUES (${userId}::uuid, 'QA Local')
`
await sql`
  INSERT INTO accounts (id, user_id, name, type, institution, last4, extra_meta)
  VALUES
    (${c6Id}::uuid, ${userId}::uuid, 'Corrente', 'checking', 'C6', '1234', ${JSON.stringify({ transferNumber: "336/0001/1" })}),
    (${nuId}::uuid, ${userId}::uuid, 'Corrente', 'checking', 'Nubank', '2222', ${JSON.stringify({ transferNumber: "260/0001/1" })}),
    (${nuCard}::uuid, ${userId}::uuid, 'Cartão', 'credit_card', 'Nubank', '3333', ${JSON.stringify({ transferNumber: "260/0001/1", creditData: { closeDay: 7, dueDay: 15 } })})
`
await sql`
  INSERT INTO transactions (
    user_id, account_id, date, description, amount, external_hash, source_type, source_category, installment
  ) VALUES
    (${userId}::uuid, ${c6Id}::uuid, '2026-10-02', 'Padaria', ${"-38.90"}, 'seed-padaria', 'checking', 'Food', NULL),
    (${userId}::uuid, ${nuCard}::uuid, '2026-09-15', 'Loja Eletro Teste', ${"-300.00"}, 'seed-eletro', 'credit_card', 'Electronics', '1/3')
`
console.log("seeded", email)
await sql.end({ timeout: 5 })
