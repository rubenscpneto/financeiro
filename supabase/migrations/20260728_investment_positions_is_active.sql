-- Soft-deactivate sold / matured / TOTAL_WITHDRAWAL positions
alter table public.investment_positions
  add column if not exists is_active boolean not null default true;
