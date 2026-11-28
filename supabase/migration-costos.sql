-- Costos y precio de mercado de cada producto (nov 2026)
--
-- Van en una tabla aparte y solo para el admin: la tabla products se lee
-- pública desde la tienda (la web pide "select *"), así que una columna de
-- costo ahí quedaría a la vista de cualquiera.
--
-- Se puede correr más de una vez.

create table if not exists public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  -- Lo que le costó al dueño, en dólares (con envío e impuestos si los paga él)
  cost_usd numeric(12,2) not null check (cost_usd > 0),
  -- Precio de referencia del mercado que cargó el dueño (StockX, MercadoLibre…)
  market_price_usd numeric(12,2) check (market_price_usd is null or market_price_usd > 0),
  -- De dónde lo sacó: "StockX talle 42", "MercadoLibre"…
  market_note text,
  market_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.product_costs enable row level security;

drop policy if exists "product_costs_admin_all" on public.product_costs;
create policy "product_costs_admin_all" on public.product_costs
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

revoke all on public.product_costs from anon;

-- ── Competencia (nov 2026) ────────────────────────────────────────────────
-- Webs de otros revendedores para comparar precios desde el panel. Solo admin.
-- platform: cómo se leen sus productos (Shopify y WooCommerce tienen búsqueda
-- pública en JSON; el resto queda como acceso directo).

create table if not exists public.competitor_sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  platform text not null default 'manual',
  currency text not null default 'ARS',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.competitor_sites drop constraint if exists competitor_sites_platform_check;
alter table public.competitor_sites add constraint competitor_sites_platform_check
  check (platform in ('shopify', 'woocommerce', 'manual'));
alter table public.competitor_sites drop constraint if exists competitor_sites_currency_check;
alter table public.competitor_sites add constraint competitor_sites_currency_check
  check (currency in ('ARS', 'USD'));

alter table public.competitor_sites enable row level security;

drop policy if exists "competitor_sites_admin_all" on public.competitor_sites;
create policy "competitor_sites_admin_all" on public.competitor_sites
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

revoke all on public.competitor_sites from anon;
