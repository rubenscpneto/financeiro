-- One local account per Pluggy account; balances keyed by account_id

alter table public.accounts
  add column if not exists pluggy_account_id text;

alter table public.accounts
  alter column institution set default '';

create unique index if not exists accounts_user_pluggy_account_uidx
  on public.accounts (user_id, pluggy_account_id)
  where pluggy_account_id is not null;

-- Rebuild balance_snapshots: PK (user_id, account_id)
drop table if exists public.balance_snapshots;

create table public.balance_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  source_type text not null check (source_type in ('checking', 'credit_card', 'investment')),
  balance numeric not null,
  pluggy_account_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, account_id)
);

alter table public.balance_snapshots enable row level security;

create policy "balance_snapshots_select_own"
  on public.balance_snapshots
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "balance_snapshots_insert_own"
  on public.balance_snapshots
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "balance_snapshots_update_own"
  on public.balance_snapshots
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "balance_snapshots_delete_own"
  on public.balance_snapshots
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.balance_snapshots to authenticated;
grant select, insert, update, delete on public.balance_snapshots to service_role;
