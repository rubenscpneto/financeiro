-- Part 2 screens: encrypted user settings + loan write-off adjustments,
-- public CDI cache (BCB SGS 12), optional encrypted account extra_meta,
-- investment due_date.
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "extra_meta" text;
--> statement-breakpoint
ALTER TABLE "investment_positions" ADD COLUMN IF NOT EXISTS "due_date" date;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_settings" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "payload" text NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adjustments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "kind" text NOT NULL,
  "category" text NOT NULL,
  "amount" text NOT NULL,
  "ref_id" uuid,
  "notes" text,
  "undone_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "adjustments_user_id_idx" ON "adjustments" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "adjustments_user_date_idx" ON "adjustments" ("user_id", "date" DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cdi_daily" (
  "date" date PRIMARY KEY NOT NULL,
  "rate" text NOT NULL,
  "fetched_at" timestamptz DEFAULT now() NOT NULL
);
