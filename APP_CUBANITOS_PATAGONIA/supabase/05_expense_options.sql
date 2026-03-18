-- =====================================================
-- MIGRACION: catalogo de proveedores y descripciones de gastos
-- Ejecutar en SQL Editor del proyecto ya creado.
-- =====================================================

create table if not exists public.expense_options (
  kind text not null,
  value text not null,
  created_at timestamptz not null default now(),
  constraint expense_options_kind_check check (kind in ('provider', 'description')),
  constraint expense_options_pk primary key (kind, value)
);

alter table public.expense_options enable row level security;

drop policy if exists expense_options_select_all on public.expense_options;
drop policy if exists expense_options_write_admin on public.expense_options;

create policy expense_options_select_all on public.expense_options
for select to anon, authenticated
using (true);

create policy expense_options_write_admin on public.expense_options
for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

grant select on public.expense_options to anon, authenticated;
grant insert, update, delete on public.expense_options to authenticated;
