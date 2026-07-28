-- Pluggy sync: live balances from Open Finance (Meu Pluggy)
-- Apply in Supabase SQL Editor if not using CLI migrations.

create table if not exists public.balance_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('checking', 'credit_card', 'investment')),
  balance numeric not null,
  pluggy_account_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, source_type)
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

grant select, insert, update on public.balance_snapshots to authenticated;
