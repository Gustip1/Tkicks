-- ═══════════════════════════════════════════════════════════════════════════
-- Consultas guardadas en la web (nov 2026)
--
-- Antes, una oferta, un pedido de talle o un encargo solo "existían" si la
-- persona llegaba a apretar Enviar en WhatsApp. Desde el navegador interno de
-- Instagram (2 de cada 3 consultas) WhatsApp muchas veces no se abre, y el
-- mensaje nunca llegaba. Ahora quedan guardadas acá con el teléfono, y se ven
-- en /admin/consultas.
--
-- Correr una sola vez en Supabase → SQL Editor. Se puede volver a correr.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- offer: oferta · size_request: busca un talle · question: consulta · custom_order: encargo
  kind text not null check (kind in ('offer', 'size_request', 'question', 'custom_order')),
  status text not null default 'new' check (status in ('new', 'answered', 'discarded')),
  phone text not null,
  name text,
  product_slug text,
  product_title text,
  size text,
  amount numeric,
  currency text,
  message text,
  page_path text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_leads_status on public.leads (status);

alter table public.leads enable row level security;

-- Solo el admin las lee y las marca. La web las guarda desde el servidor
-- (clave de servicio), así que no hay permiso público de ningún tipo.
drop policy if exists "leads_admin_all" on public.leads;
create policy "leads_admin_all" on public.leads
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

revoke all on public.leads from anon;

-- De paso: los encargos viejos (custom_orders) se podían leer sin iniciar sesión.
drop policy if exists "read custom orders" on public.custom_orders;
drop policy if exists "read_custom_orders_admin_only" on public.custom_orders;
create policy "read_custom_orders_admin_only" on public.custom_orders
  for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
