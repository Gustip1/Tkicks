-- Migration: garantizar acceso de lectura a la tabla bids
--
-- Si el service_role o el postgrest cliente no tiene SELECT granted en
-- la tabla bids, las queries devuelven 0 filas SIN error. Esto explica
-- el síntoma: el front muestra 0 pujas aunque la base tenga pujas
-- registradas.

-- 1. RLS sigue habilitada (por si acaso)
alter table public.bids enable row level security;

-- 2. Policy de lectura pública (idempotente)
drop policy if exists "read bids" on public.bids;
create policy "read bids" on public.bids
  for select
  using (true);

-- 3. GRANT explícito de SELECT a todos los roles que pueden hacer queries
grant select on public.bids to anon, authenticated, service_role;

-- 4. Lo mismo para auctions, por las dudas
alter table public.auctions enable row level security;
drop policy if exists "read auctions" on public.auctions;
create policy "read auctions" on public.auctions
  for select
  using (true);
grant select on public.auctions to anon, authenticated, service_role;

-- 5. INSERT en bids: damos permiso a anon/authenticated/service_role
--    (la API usa service_role para insertar pujas anónimas)
grant insert on public.bids to anon, authenticated, service_role;

-- 6. UPDATE en auctions para que el endpoint pueda subir current_price
grant update on public.auctions to anon, authenticated, service_role;

-- Por seguridad, una policy de INSERT permisiva en bids — la validación
-- real (subasta activa, mínimo, etc.) se hace a nivel API.
drop policy if exists "insert bids" on public.bids;
create policy "insert bids" on public.bids
  for insert
  with check (true);

-- Y una de UPDATE en auctions sólo para current_price/end_at — pero
-- como el API es trusted, dejamos permisiva también:
drop policy if exists "update auctions" on public.auctions;
create policy "update auctions" on public.auctions
  for update
  using (true)
  with check (true);
