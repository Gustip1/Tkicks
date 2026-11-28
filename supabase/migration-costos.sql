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
