-- =====================================================
-- MIGRACION: promos por producto y canal (v2)
-- Ejecutar en SQL Editor del proyecto ya creado.
-- =====================================================

create table if not exists public.product_promotions (
  sku text primary key references public.products (sku) on delete cascade,
  presencial_pack_units integer not null default 0 check (presencial_pack_units >= 0),
  presencial_pack_price numeric(12,2) not null default 0 check (presencial_pack_price >= 0),
  pedidosya_pack_units integer not null default 0 check (pedidosya_pack_units >= 0),
  pedidosya_pack_price numeric(12,2) not null default 0 check (pedidosya_pack_price >= 0),
  updated_at timestamptz not null default now()
);

alter table public.product_promotions
  add column if not exists presencial_pack_units integer not null default 0;

alter table public.product_promotions
  add column if not exists pedidosya_pack_units integer not null default 0;

alter table public.product_promotions
  add column if not exists pedidosya_pack_price numeric(12,2) not null default 0;

alter table public.product_promotions
  alter column presencial_pack_price set default 0;

alter table public.product_promotions
  alter column presencial_pack_units set default 0;

alter table public.product_promotions
  alter column pedidosya_pack_units set default 0;

alter table public.product_promotions
  alter column pedidosya_pack_price set default 0;

-- Compatibilidad con esquema viejo:
-- si existia promo de garrapiñadas solo por precio, asigna 3 unidades.
update public.product_promotions
set presencial_pack_units = 3
where sku = 'garrapinadas'
  and coalesce(presencial_pack_units, 0) = 0
  and coalesce(presencial_pack_price, 0) > 0;

-- Semilla por defecto para mantener el comportamiento original.
insert into public.product_promotions (
  sku,
  presencial_pack_units,
  presencial_pack_price,
  pedidosya_pack_units,
  pedidosya_pack_price
)
values ('garrapinadas', 3, 3000, 0, 0)
on conflict (sku) do nothing;

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
