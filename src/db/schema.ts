import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const accountTypeEnum = pgEnum("account_type", [
  "checking",
  "credit_card",
  "investment",
])
export const assetClassEnum = pgEnum("asset_class", [
  "renda_fixa",
  "acao",
  "fii",
  "etf",
  "cripto",
  "outro",
])
export const categoryKindEnum = pgEnum("category_kind", [
  "income",
  "expense",
  "transfer",
])
export const importSourceTypeEnum = pgEnum("import_source_type", [
  "checking",
  "credit_card",
  "investment",
])
export const importStatusEnum = pgEnum("import_status", [
  "pending",
  "parsed",
  "committed",
  "failed",
])
export const investmentMovementTypeEnum = pgEnum("investment_movement_type", [
  "aporte",
  "resgate",
  "provento",
  "outro",
])

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" })

/** Better Auth user — uuid ids match existing user_id columns. */
export const user = pgTable("user", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
})

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    expiresAt: timestamptz("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
)

export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamptz("access_token_expires_at"),
    refreshTokenExpiresAt: timestamptz("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
)

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
)

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  nome: text("nome"),
  locale: text("locale").notNull().default("pt-BR"),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  created_at: timestamptz("created_at").notNull().defaultNow(),
  updated_at: timestamptz("updated_at").notNull().defaultNow(),
})

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    institution: text("institution").notNull().default(""),
    last4: text("last4"),
    currency: text("currency").notNull().default("BRL"),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamptz("created_at").notNull().defaultNow(),
    updated_at: timestamptz("updated_at").notNull().defaultNow(),
    pluggy_account_id: text("pluggy_account_id"),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.user_id),
    uniqueIndex("accounts_user_pluggy_account_uidx")
      .on(table.user_id, table.pluggy_account_id)
      .where(sql`${table.pluggy_account_id} is not null`),
  ]
)

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: categoryKindEnum("kind").notNull().default("expense"),
    color: text("color"),
    is_system: boolean("is_system").notNull().default(false),
    created_at: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("categories_user_id_idx").on(table.user_id),
    uniqueIndex("categories_user_name_kind_uidx").on(
      table.user_id,
      table.name,
      table.kind
    ),
  ]
)

export const categoryRules = pgTable(
  "category_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    match_pattern: text("match_pattern").notNull(),
    category_id: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    priority: integer("priority").notNull().default(100),
    account_type: accountTypeEnum("account_type"),
    created_at: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("category_rules_user_id_idx").on(table.user_id),
    index("category_rules_category_id_idx").on(table.category_id),
  ]
)

export const imports = pgTable(
  "imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    account_id: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    source_type: importSourceTypeEnum("source_type").notNull(),
    file_format: text("file_format").notNull(),
    file_path: text("file_path"),
    file_name: text("file_name"),
    status: importStatusEnum("status").notNull().default("pending"),
    raw_meta: jsonb("raw_meta")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    error: text("error"),
    created_at: timestamptz("created_at").notNull().defaultNow(),
    updated_at: timestamptz("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("imports_user_id_idx").on(table.user_id),
    index("imports_account_id_idx").on(table.account_id),
  ]
)

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    account_id: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    import_id: uuid("import_id").references(() => imports.id, {
      onDelete: "set null",
    }),
    date: date("date", { mode: "string" }).notNull(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    category_id: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    merchant: text("merchant"),
    installment: text("installment"),
    external_hash: text("external_hash").notNull(),
    source_category: text("source_category"),
    notes: text("notes"),
    is_transfer: boolean("is_transfer").notNull().default(false),
    created_at: timestamptz("created_at").notNull().defaultNow(),
    updated_at: timestamptz("updated_at").notNull().defaultNow(),
    source_type: importSourceTypeEnum("source_type"),
  },
  (table) => [
    uniqueIndex("transactions_user_hash_uidx").on(
      table.user_id,
      table.external_hash
    ),
    index("transactions_account_idx").on(table.account_id),
    index("transactions_category_idx").on(table.category_id),
    index("transactions_import_id_idx").on(table.import_id),
    index("transactions_user_date_idx").on(table.user_id, table.date.desc()),
    index("transactions_user_source_type_idx").on(
      table.user_id,
      table.source_type
    ),
  ]
)

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    category_id: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    year_month: text("year_month").notNull(),
    limit_amount: numeric("limit_amount", { precision: 14, scale: 2 }).notNull(),
    created_at: timestamptz("created_at").notNull().defaultNow(),
    updated_at: timestamptz("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("budgets_user_cat_month_uidx").on(
      table.user_id,
      table.category_id,
      table.year_month
    ),
    index("budgets_category_id_idx").on(table.category_id),
    check("budgets_year_month_chk", sql`year_month ~ '^\d{4}-\d{2}$'`),
  ]
)

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    target_amount: numeric("target_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
    current_amount: numeric("current_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    deadline: date("deadline", { mode: "string" }),
    color: text("color"),
    is_archived: boolean("is_archived").notNull().default(false),
    created_at: timestamptz("created_at").notNull().defaultNow(),
    updated_at: timestamptz("updated_at").notNull().defaultNow(),
  },
  (table) => [index("goals_user_id_idx").on(table.user_id)]
)

export const investmentPositions = pgTable(
  "investment_positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    account_id: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    ticker: text("ticker"),
    asset_name: text("asset_name").notNull(),
    asset_class: assetClassEnum("asset_class").notNull().default("outro"),
    quantity: numeric("quantity", { precision: 18, scale: 8 })
      .notNull()
      .default("0"),
    avg_price: numeric("avg_price", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    current_price: numeric("current_price", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    as_of: date("as_of", { mode: "string" }).notNull().default(sql`CURRENT_DATE`),
    external_hash: text("external_hash").notNull(),
    created_at: timestamptz("created_at").notNull().defaultNow(),
    updated_at: timestamptz("updated_at").notNull().defaultNow(),
    purchase_date: date("purchase_date", { mode: "string" }),
    rate: numeric("rate"),
    rate_type: text("rate_type"),
    amount_original: numeric("amount_original"),
    amount_withdrawal: numeric("amount_withdrawal"),
    is_active: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("investment_positions_user_hash_uidx").on(
      table.user_id,
      table.external_hash
    ),
    index("investment_positions_user_id_idx").on(table.user_id),
    index("investment_positions_account_id_idx").on(table.account_id),
  ]
)

export const investmentMovements = pgTable(
  "investment_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    account_id: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    position_id: uuid("position_id").references(() => investmentPositions.id, {
      onDelete: "set null",
    }),
    import_id: uuid("import_id").references(() => imports.id, {
      onDelete: "set null",
    }),
    date: date("date", { mode: "string" }).notNull(),
    type: investmentMovementTypeEnum("type").notNull().default("outro"),
    description: text("description"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    external_hash: text("external_hash").notNull(),
    created_at: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("investment_movements_user_hash_uidx").on(
      table.user_id,
      table.external_hash
    ),
    index("investment_movements_user_date_idx").on(
      table.user_id,
      table.date.desc()
    ),
    index("investment_movements_account_id_idx").on(table.account_id),
    index("investment_movements_import_id_idx").on(table.import_id),
    index("investment_movements_position_id_idx").on(table.position_id),
  ]
)

export const balanceSnapshots = pgTable(
  "balance_snapshots",
  {
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    account_id: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    source_type: text("source_type").notNull(),
    balance: numeric("balance").notNull(),
    pluggy_account_id: text("pluggy_account_id"),
    updated_at: timestamptz("updated_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "balance_snapshots_pkey",
      columns: [table.user_id, table.account_id],
    }),
    check(
      "balance_snapshots_source_type_check",
      sql`source_type = ANY (ARRAY['checking'::text, 'credit_card'::text, 'investment'::text])`
    ),
  ]
)
