-- =====================================================
-- MIGRACION: caja inicial y ajuste diario
-- Ejecutar en SQL Editor del proyecto ya creado.
-- =====================================================

create table if not exists public.daily_cash_adjustments (
  day date primary key,
  initial numeric(12,2) not null default 0,
  real numeric(12,2),
  delta numeric(12,2),
  adjust_saved boolean not null default false,
  initial_locked boolean not null default false,
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.daily_cash_adjustments enable row level security;

drop policy if exists cash_adjust_select_all on public.daily_cash_adjustments;
drop policy if exists cash_adjust_write_admin on public.daily_cash_adjustments;

create policy cash_adjust_select_all on public.daily_cash_adjustments
for select to anon, authenticated
using (true);

create policy cash_adjust_write_admin on public.daily_cash_adjustments
for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

grant select on public.daily_cash_adjustments to anon, authenticated;
grant insert, update, delete on public.daily_cash_adjustments to authenticated;
