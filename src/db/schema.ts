import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
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
    pluggy_account_id_bidx: text("pluggy_account_id_bidx"),
    extra_meta: text("extra_meta"),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.user_id),
    uniqueIndex("accounts_user_pluggy_bidx_uidx")
      .on(table.user_id, table.pluggy_account_id_bidx)
      .where(sql`${table.pluggy_account_id_bidx} is not null`),
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
    amount: text("amount").notNull(),
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
    limit_amount: text("limit_amount").notNull(),
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
    target_amount: text("target_amount").notNull(),
    current_amount: text("current_amount").notNull().default("0"),
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
    quantity: text("quantity").notNull().default("0"),
    avg_price: text("avg_price").notNull().default("0"),
    current_price: text("current_price").notNull().default("0"),
    as_of: date("as_of", { mode: "string" }).notNull().default(sql`CURRENT_DATE`),
    external_hash: text("external_hash").notNull(),
    created_at: timestamptz("created_at").notNull().defaultNow(),
    updated_at: timestamptz("updated_at").notNull().defaultNow(),
    purchase_date: date("purchase_date", { mode: "string" }),
    rate: text("rate"),
    rate_type: text("rate_type"),
    amount_original: text("amount_original"),
    amount_withdrawal: text("amount_withdrawal"),
    due_date: date("due_date", { mode: "string" }),
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
    amount: text("amount").notNull(),
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
    balance: text("balance").notNull(),
    pluggy_account_id: text("pluggy_account_id"),
    pluggy_account_id_bidx: text("pluggy_account_id_bidx"),
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

/** Per-user wrapped DEK. KEK never stored here. */
export const userKeys = pgTable("user_keys", {
  user_id: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  wrapped_dek: text("wrapped_dek").notNull(),
  kek_version: text("kek_version").notNull(),
  created_at: timestamptz("created_at").notNull().defaultNow(),
})

/** v2 sharing placeholder — schema only. */
export const keyGrants = pgTable(
  "key_grants",
  {
    scope_id: uuid("scope_id").notNull(),
    grantee_user_id: uuid("grantee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    wrapped_dek: text("wrapped_dek").notNull(),
    created_at: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "key_grants_pkey",
      columns: [table.scope_id, table.grantee_user_id],
    }),
    index("key_grants_grantee_idx").on(table.grantee_user_id),
  ]
)

export const pluggyConnections = pgTable("pluggy_connections", {
  user_id: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  item_id: text("item_id").notNull(),
  created_at: timestamptz("created_at").notNull().defaultNow(),
  updated_at: timestamptz("updated_at").notNull().defaultNow(),
})

/** Encrypted JSON settings payload (theme, alerts, hide-values default). */
export const userSettings = pgTable("user_settings", {
  user_id: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  updated_at: timestamptz("updated_at").notNull().defaultNow(),
})

/** Non-cash adjustments (e.g. loan write-off → Ajuda à família). Amount/notes encrypted. */
export const adjustments = pgTable(
  "adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    kind: text("kind").notNull(),
    category: text("category").notNull(),
    amount: text("amount").notNull(),
    ref_id: uuid("ref_id"),
    notes: text("notes"),
    undone_at: timestamptz("undone_at"),
    created_at: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("adjustments_user_id_idx").on(table.user_id),
    index("adjustments_user_date_idx").on(table.user_id, table.date.desc()),
  ]
)

/** Public BCB SGS series 12 daily CDI rates (% a.d.). Not user PII. */
export const cdiDaily = pgTable("cdi_daily", {
  date: date("date", { mode: "string" }).primaryKey(),
  rate: text("rate").notNull(),
  fetched_at: timestamptz("fetched_at").notNull().defaultNow(),
})
