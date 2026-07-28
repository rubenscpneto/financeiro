-- Covering indexes for unindexed foreign keys (Supabase performance advisor).

create index if not exists budgets_category_id_idx
  on public.budgets (category_id);

create index if not exists category_rules_category_id_idx
  on public.category_rules (category_id);

create index if not exists imports_account_id_idx
  on public.imports (account_id);

create index if not exists investment_movements_account_id_idx
  on public.investment_movements (account_id);

create index if not exists investment_movements_import_id_idx
  on public.investment_movements (import_id);

create index if not exists investment_movements_position_id_idx
  on public.investment_movements (position_id);

create index if not exists investment_positions_account_id_idx
  on public.investment_positions (account_id);

create index if not exists transactions_import_id_idx
  on public.transactions (import_id);
