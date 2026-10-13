-- Expand: key tables + numeric→text ciphertext columns + blind-index columns.
-- Backfill with `npx tsx scripts/encrypt-existing-data.ts` (idempotent).
-- Contract: that script --verify (no plaintext leftovers). Do not skip the backup.

CREATE TABLE IF NOT EXISTS "user_keys" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "wrapped_dek" text NOT NULL,
  "kek_version" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "key_grants" (
  "scope_id" uuid NOT NULL,
  "grantee_user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "wrapped_dek" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "key_grants_pkey" PRIMARY KEY ("scope_id", "grantee_user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "key_grants_grantee_idx" ON "key_grants" ("grantee_user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pluggy_connections" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "item_id" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "pluggy_account_id_bidx" text;
--> statement-breakpoint
ALTER TABLE "balance_snapshots" ADD COLUMN IF NOT EXISTS "pluggy_account_id_bidx" text;
--> statement-breakpoint
DROP INDEX IF EXISTS "accounts_user_pluggy_account_uidx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_user_pluggy_bidx_uidx"
  ON "accounts" ("user_id", "pluggy_account_id_bidx")
  WHERE "pluggy_account_id_bidx" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "amount" TYPE text USING "amount"::text;
--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "limit_amount" TYPE text USING "limit_amount"::text;
--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "target_amount" TYPE text USING "target_amount"::text;
--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "current_amount" TYPE text USING "current_amount"::text;
--> statement-breakpoint
ALTER TABLE "investment_positions" ALTER COLUMN "quantity" TYPE text USING "quantity"::text;
--> statement-breakpoint
ALTER TABLE "investment_positions" ALTER COLUMN "avg_price" TYPE text USING "avg_price"::text;
--> statement-breakpoint
ALTER TABLE "investment_positions" ALTER COLUMN "current_price" TYPE text USING "current_price"::text;
--> statement-breakpoint
ALTER TABLE "investment_positions" ALTER COLUMN "rate" TYPE text USING "rate"::text;
--> statement-breakpoint
ALTER TABLE "investment_positions" ALTER COLUMN "amount_original" TYPE text USING "amount_original"::text;
--> statement-breakpoint
ALTER TABLE "investment_positions" ALTER COLUMN "amount_withdrawal" TYPE text USING "amount_withdrawal"::text;
--> statement-breakpoint
ALTER TABLE "investment_movements" ALTER COLUMN "amount" TYPE text USING "amount"::text;
--> statement-breakpoint
ALTER TABLE "balance_snapshots" ALTER COLUMN "balance" TYPE text USING "balance"::text;
