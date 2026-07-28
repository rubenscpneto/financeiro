-- Net withdrawable value from Pluggy (after taxes)
alter table public.investment_positions
  add column if not exists amount_withdrawal numeric;
