-- =====================================================
-- MIGRACION: promo configurable por producto (presencial)
-- Ejecutar en SQL Editor del proyecto ya creado.
-- =====================================================

create table if not exists public.product_promotions (
  sku text primary key references public.products (sku) on delete cascade,
  presencial_pack_price numeric(12,2) not null default 3000 check (presencial_pack_price >= 0),
  updated_at timestamptz not null default now()
);

alter table public.product_promotions enable row level security;

drop policy if exists product_promotions_select_all on public.product_promotions;
drop policy if exists product_promotions_write_admin on public.product_promotions;

create policy product_promotions_select_all on public.product_promotions
for select to anon, authenticated
using (true);

create policy product_promotions_write_admin on public.product_promotions
for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

grant select on public.product_promotions to anon, authenticated;
grant insert, update, delete on public.product_promotions to authenticated;
