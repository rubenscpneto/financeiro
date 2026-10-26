-- User classification override (survives Pluggy sync) + per-title reserve exclusion.
alter table public.transactions
  add column if not exists user_category_id uuid references public.categories(id) on delete set null;

create index if not exists transactions_user_category_idx
  on public.transactions (user_category_id);

alter table public.investment_positions
  add column if not exists exclude_from_reserve boolean not null default false;
