-- =====================================================
-- MIGRACION: promos mixtas personalizadas con nombre
-- Ejecutar en SQL Editor del proyecto ya creado.
-- =====================================================

create table if not exists public.custom_promotions (
  id text primary key,
  name text not null,
  channel text not null,
  price numeric(12,2) not null default 0,
  items_json jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.custom_promotions
  add column if not exists name text;

alter table public.custom_promotions
  add column if not exists channel text;

alter table public.custom_promotions
  add column if not exists price numeric(12,2);

alter table public.custom_promotions
  add column if not exists items_json jsonb default '[]'::jsonb;

alter table public.custom_promotions
  add column if not exists active boolean default true;

alter table public.custom_promotions
  add column if not exists updated_at timestamptz default now();

alter table public.custom_promotions
  add column if not exists created_at timestamptz default now();

update public.custom_promotions
set
  name = coalesce(nullif(trim(name), ''), 'Promo sin nombre'),
  channel = case
    when lower(coalesce(channel, '')) in ('presencial', 'pedidosya') then lower(channel)
    else 'presencial'
  end,
  price = coalesce(price, 0),
  items_json = coalesce(items_json, '[]'::jsonb),
  active = coalesce(active, true),
  updated_at = coalesce(updated_at, now()),
  created_at = coalesce(created_at, now());

alter table public.custom_promotions
  alter column name set default 'Promo sin nombre',
  alter column name set not null,
  alter column channel set default 'presencial',
  alter column channel set not null,
  alter column price set default 0,
  alter column price set not null,
  alter column items_json set default '[]'::jsonb,
  alter column items_json set not null,
  alter column active set default true,
  alter column active set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'custom_promotions_channel_check'
      and conrelid = 'public.custom_promotions'::regclass
  ) then
    alter table public.custom_promotions
      add constraint custom_promotions_channel_check
      check (channel in ('presencial', 'pedidosya'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'custom_promotions_price_check'
      and conrelid = 'public.custom_promotions'::regclass
  ) then
    alter table public.custom_promotions
      add constraint custom_promotions_price_check
      check (price >= 0);
  end if;
end
$$;

create index if not exists custom_promotions_channel_active_idx
  on public.custom_promotions (channel, active);

alter table public.custom_promotions enable row level security;

drop policy if exists custom_promotions_select_all on public.custom_promotions;
drop policy if exists custom_promotions_write_admin on public.custom_promotions;

create policy custom_promotions_select_all on public.custom_promotions
for select to anon, authenticated
using (true);

create policy custom_promotions_write_admin on public.custom_promotions
for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

grant select on public.custom_promotions to anon, authenticated;
grant insert, update, delete on public.custom_promotions to authenticated;
