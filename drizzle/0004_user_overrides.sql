-- User classification override (survives Pluggy sync) + per-title reserve exclusion.
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "user_category_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "transactions"
    ADD CONSTRAINT "transactions_user_category_id_categories_id_fk"
    FOREIGN KEY ("user_category_id") REFERENCES "categories"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_user_category_idx" ON "transactions" ("user_category_id");
--> statement-breakpoint
ALTER TABLE "investment_positions" ADD COLUMN IF NOT EXISTS "exclude_from_reserve" boolean NOT NULL DEFAULT false;
