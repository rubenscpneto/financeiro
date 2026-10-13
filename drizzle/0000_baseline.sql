-- Baseline matching the existing public schema (no-op on a DB that already has these objects).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."account_type" AS ENUM('checking', 'credit_card', 'investment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."asset_class" AS ENUM('renda_fixa', 'acao', 'fii', 'etf', 'cripto', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."category_kind" AS ENUM('income', 'expense', 'transfer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."import_source_type" AS ENUM('checking', 'credit_card', 'investment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."import_status" AS ENUM('pending', 'parsed', 'committed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."investment_movement_type" AS ENUM('aporte', 'resgate', 'provento', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "nome" text,
  "locale" text DEFAULT 'pt-BR' NOT NULL,
  "timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "type" "account_type" NOT NULL,
  "institution" text DEFAULT '' NOT NULL,
  "last4" text,
  "currency" text DEFAULT 'BRL' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "pluggy_account_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "kind" "category_kind" DEFAULT 'expense' NOT NULL,
  "color" text,
  "is_system" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "category_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "match_pattern" text NOT NULL,
  "category_id" uuid NOT NULL,
  "priority" integer DEFAULT 100 NOT NULL,
  "account_type" "account_type",
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "imports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "account_id" uuid,
  "source_type" "import_source_type" NOT NULL,
  "file_format" text NOT NULL,
  "file_path" text,
  "file_name" text,
  "status" "import_status" DEFAULT 'pending' NOT NULL,
  "raw_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "error" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "import_id" uuid,
  "date" date NOT NULL,
  "description" text NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "category_id" uuid,
  "merchant" text,
  "installment" text,
  "external_hash" text NOT NULL,
  "source_category" text,
  "notes" text,
  "is_transfer" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "source_type" "import_source_type"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budgets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "year_month" text NOT NULL,
  "limit_amount" numeric(14, 2) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "target_amount" numeric(14, 2) NOT NULL,
  "current_amount" numeric(14, 2) DEFAULT 0 NOT NULL,
  "deadline" date,
  "color" text,
  "is_archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "investment_positions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "ticker" text,
  "asset_name" text NOT NULL,
  "asset_class" "asset_class" DEFAULT 'outro' NOT NULL,
  "quantity" numeric(18, 8) DEFAULT 0 NOT NULL,
  "avg_price" numeric(14, 4) DEFAULT 0 NOT NULL,
  "current_price" numeric(14, 4) DEFAULT 0 NOT NULL,
  "as_of" date DEFAULT CURRENT_DATE NOT NULL,
  "external_hash" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "purchase_date" date,
  "rate" numeric,
  "rate_type" text,
  "amount_original" numeric,
  "amount_withdrawal" numeric,
  "is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "investment_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "position_id" uuid,
  "import_id" uuid,
  "date" date NOT NULL,
  "type" "investment_movement_type" DEFAULT 'outro' NOT NULL,
  "description" text,
  "amount" numeric(14, 2) NOT NULL,
  "external_hash" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "balance_snapshots" (
  "user_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "source_type" text NOT NULL,
  "balance" numeric NOT NULL,
  "pluggy_account_id" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "balance_snapshots_pkey" PRIMARY KEY("user_id","account_id")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "imports" ADD CONSTRAINT "imports_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "investment_positions" ADD CONSTRAINT "investment_positions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "investment_movements" ADD CONSTRAINT "investment_movements_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "investment_movements" ADD CONSTRAINT "investment_movements_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "investment_positions"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "investment_movements" ADD CONSTRAINT "investment_movements_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "balance_snapshots" ADD CONSTRAINT "balance_snapshots_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "budgets" ADD CONSTRAINT "budgets_year_month_chk" CHECK (year_month ~ '^\d{4}-\d{2}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "balance_snapshots" ADD CONSTRAINT "balance_snapshots_source_type_check" CHECK (source_type = ANY (ARRAY['checking'::text, 'credit_card'::text, 'investment'::text]));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_user_pluggy_account_uidx" ON "accounts" USING btree ("user_id","pluggy_account_id") WHERE pluggy_account_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_user_id_idx" ON "categories" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "categories_user_name_kind_uidx" ON "categories" USING btree ("user_id","name","kind");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "category_rules_user_id_idx" ON "category_rules" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "category_rules_category_id_idx" ON "category_rules" USING btree ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imports_user_id_idx" ON "imports" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imports_account_id_idx" ON "imports" USING btree ("account_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_user_hash_uidx" ON "transactions" USING btree ("user_id","external_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_account_idx" ON "transactions" USING btree ("account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_category_idx" ON "transactions" USING btree ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_import_id_idx" ON "transactions" USING btree ("import_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_user_date_idx" ON "transactions" USING btree ("user_id","date" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_user_source_type_idx" ON "transactions" USING btree ("user_id","source_type");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "budgets_user_cat_month_uidx" ON "budgets" USING btree ("user_id","category_id","year_month");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "budgets_category_id_idx" ON "budgets" USING btree ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goals_user_id_idx" ON "goals" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "investment_positions_user_hash_uidx" ON "investment_positions" USING btree ("user_id","external_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "investment_positions_user_id_idx" ON "investment_positions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "investment_positions_account_id_idx" ON "investment_positions" USING btree ("account_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "investment_movements_user_hash_uidx" ON "investment_movements" USING btree ("user_id","external_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "investment_movements_user_date_idx" ON "investment_movements" USING btree ("user_id","date" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "investment_movements_account_id_idx" ON "investment_movements" USING btree ("account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "investment_movements_import_id_idx" ON "investment_movements" USING btree ("import_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "investment_movements_position_id_idx" ON "investment_movements" USING btree ("position_id");
