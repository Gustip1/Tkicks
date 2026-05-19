-- ═══════════════════════════════════════════════════════════════
-- Tabla: facturas
-- Almacena cada comprobante electrónico emitido a través de ARCA.
--
-- Campo clave: titular_emisor
--   'standard' → Titular principal (efectivo / transferencia)
--   'card'     → Titular tarjeta de crédito (segunda cuenta ARCA)
--
-- Correr en Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.facturas (
  id              uuid primary key default gen_random_uuid(),

  -- Orden asociada (referencia, no FK estricta para permitir facturas manuales)
  order_id        uuid references public.orders(id) on delete set null,

  -- Quién emitió la factura: titular principal o titular tarjeta
  titular_emisor  text not null check (titular_emisor in ('standard', 'card')),

  -- Método de pago que disparó la elección del titular
  payment_method  text not null,

  -- Datos del comprobante ARCA
  cbte_tipo       smallint not null,   -- 1=Factura A, 6=B, 11=C
  pto_vta         smallint not null,
  cbte_nro        integer  not null,
  cae             text     not null,
  cae_vto         text     not null,   -- formato AAAAMMDD devuelto por ARCA

  -- Datos del receptor
  doc_tipo        smallint not null default 99,  -- 99=Consumidor Final
  doc_nro         bigint   not null default 0,
  imp_total       numeric(12, 2) not null,

  -- Descripción libre (opcional)
  descripcion     text,

  -- Auditoría
  fecha_emision   timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Índices para filtrado rápido en el panel admin
create index if not exists facturas_titular_idx    on public.facturas (titular_emisor);
create index if not exists facturas_order_idx      on public.facturas (order_id);
create index if not exists facturas_emision_idx    on public.facturas (fecha_emision desc);

-- Solo admins pueden leer/escribir facturas (RLS)
alter table public.facturas enable row level security;

-- Service role siempre puede hacer todo (lo usan las API routes del servidor)
create policy "service_role full access on facturas"
  on public.facturas
  for all
  to service_role
  using (true)
  with check (true);

-- Los admins autenticados pueden leer
create policy "admins can read facturas"
  on public.facturas
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
