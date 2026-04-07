-- =====================================================
-- MIGRACION: compatibilidad de columnas en expenses
-- Ejecutar en SQL Editor del proyecto ya creado.
-- =====================================================

create table if not exists public.expenses (
  id text primary key,
  date date not null,
  provider text not null default '',
  qty numeric(12,2) not null default 0,
  description text not null default '',
  iva numeric(12,2) not null default 0,
  iibb numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.expenses add column if not exists time text;
alter table public.expenses add column if not exists method text default 'efectivo';
alter table public.expenses add column if not exists pay_cash numeric(12,2) default 0;
alter table public.expenses add column if not exists pay_transfer numeric(12,2) default 0;
alter table public.expenses add column if not exists pay_peya numeric(12,2) default 0;

update public.expenses
set
  method = coalesce(nullif(method, ''), 'efectivo'),
  pay_cash = coalesce(pay_cash, 0),
  pay_transfer = coalesce(pay_transfer, 0),
  pay_peya = coalesce(pay_peya, 0)
where method is null
  or method = ''
  or pay_cash is null
  or pay_transfer is null
  or pay_peya is null;

alter table public.expenses alter column method set default 'efectivo';
alter table public.expenses alter column pay_cash set default 0;
alter table public.expenses alter column pay_transfer set default 0;
alter table public.expenses alter column pay_peya set default 0;
