-- Extra Pluggy fields for Ativos display (rentabilidade, data, valor investido)
alter table public.investment_positions
  add column if not exists purchase_date date,
  add column if not exists rate numeric,
  add column if not exists rate_type text,
  add column if not exists amount_original numeric;
