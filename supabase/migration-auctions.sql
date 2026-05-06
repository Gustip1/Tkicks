-- ────────────────────────────────────────────────────────────────────────────
-- Tkicks · Subastas (Auctions)
-- Idempotente: se puede correr varias veces sin romper.
-- ────────────────────────────────────────────────────────────────────────────

-- Enum auction_status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'auction_status') then
    create type auction_status as enum ('active', 'ended', 'cancelled', 'paid');
  end if;
end$$;

-- Tabla auctions
create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  starting_price numeric(12,2) not null check (starting_price >= 0),
  current_price  numeric(12,2) not null check (current_price >= 0),
  min_increment  numeric(12,2) not null default 1000 check (min_increment > 0),
  status auction_status not null default 'active',
  start_at timestamptz not null default now(),
  end_at   timestamptz not null,
  anti_snipe_window_seconds int not null default 120,
  anti_snipe_extend_seconds int not null default 300,
  winner_user_id uuid references auth.users(id) on delete set null,
  winner_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists auctions_status_end_at_idx on public.auctions (status, end_at);
create index if not exists auctions_product_idx on public.auctions (product_id);
create index if not exists auctions_variant_idx on public.auctions (variant_id);

drop trigger if exists trg_auctions_set_updated_at on public.auctions;
create trigger trg_auctions_set_updated_at
before update on public.auctions
for each row execute function public.set_updated_at();

-- Tabla bids
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  amount     numeric(12,2) not null check (amount > 0),
  created_at timestamptz default now()
);

create index if not exists bids_auction_amount_idx on public.bids (auction_id, amount desc, created_at desc);
create index if not exists bids_user_idx on public.bids (user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────────────────
alter table public.auctions enable row level security;
alter table public.bids     enable row level security;

drop policy if exists "read auctions" on public.auctions;
create policy "read auctions" on public.auctions for select using (true);

drop policy if exists "admin write auctions" on public.auctions;
create policy "admin write auctions" on public.auctions
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "read bids" on public.bids;
create policy "read bids" on public.bids for select using (true);

-- Las pujas se insertan ÚNICAMENTE vía RPC place_bid (security definer).
-- No habilitamos políticas de INSERT/UPDATE/DELETE para anon/authenticated.
revoke insert, update, delete on public.bids from anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- RPC: create_auction (solo admin)
-- Reserva 1 unidad de stock de la variante.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.create_auction(
  p_variant_id uuid,
  p_starting_price numeric,
  p_duration_hours int default 48,
  p_min_increment numeric default 1000,
  p_anti_snipe_window_seconds int default 120,
  p_anti_snipe_extend_seconds int default 300
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_product_id uuid;
  v_stock int;
  v_auction_id uuid;
begin
  if v_uid is null then
    raise exception 'login required' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'admin' then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_starting_price is null or p_starting_price < 0 then
    raise exception 'invalid starting_price';
  end if;
  if p_duration_hours is null or p_duration_hours <= 0 then
    raise exception 'invalid duration';
  end if;
  if p_min_increment is null or p_min_increment <= 0 then
    raise exception 'invalid min_increment';
  end if;

  -- bloquear variante para evitar carrera de stock
  select product_id, stock
    into v_product_id, v_stock
  from public.product_variants
  where id = p_variant_id
  for update;

  if not found then
    raise exception 'variant not found';
  end if;

  if v_stock < 1 then
    raise exception 'no stock available for variant';
  end if;

  -- una sola subasta activa por variante
  if exists (
    select 1 from public.auctions
    where variant_id = p_variant_id and status = 'active'
  ) then
    raise exception 'variant already has an active auction';
  end if;

  -- reservar stock
  update public.product_variants
    set stock = stock - 1
  where id = p_variant_id;

  insert into public.auctions (
    product_id, variant_id,
    starting_price, current_price, min_increment,
    status, start_at, end_at,
    anti_snipe_window_seconds, anti_snipe_extend_seconds
  ) values (
    v_product_id, p_variant_id,
    p_starting_price, p_starting_price, p_min_increment,
    'active', now(), now() + make_interval(hours => p_duration_hours),
    p_anti_snipe_window_seconds, p_anti_snipe_extend_seconds
  )
  returning id into v_auction_id;

  return v_auction_id;
end;
$$;

revoke all on function public.create_auction(uuid, numeric, int, numeric, int, int) from public;
grant execute on function public.create_auction(uuid, numeric, int, numeric, int, int) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- RPC: place_bid (cualquier usuario autenticado)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.place_bid(
  p_auction_id uuid,
  p_amount numeric
) returns table (bid_id uuid, new_current_price numeric, new_end_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_a public.auctions%rowtype;
  v_min_required numeric;
  v_remaining int;
  v_new_end timestamptz;
  v_bid_id uuid;
  v_top_bidder uuid;
begin
  if v_uid is null then
    raise exception 'login required' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;

  select * into v_a from public.auctions where id = p_auction_id for update;
  if not found then
    raise exception 'auction not found';
  end if;

  if v_a.status <> 'active' then
    raise exception 'auction not active';
  end if;

  if v_a.end_at <= now() then
    raise exception 'auction ended';
  end if;

  -- monto mínimo requerido
  select user_id into v_top_bidder
  from public.bids
  where auction_id = p_auction_id
  order by amount desc, created_at desc
  limit 1;

  if v_top_bidder is null then
    v_min_required := v_a.starting_price;
  else
    v_min_required := v_a.current_price + v_a.min_increment;
    if v_top_bidder = v_uid then
      raise exception 'already top bidder';
    end if;
  end if;

  if p_amount < v_min_required then
    raise exception 'bid below minimum: % required', v_min_required;
  end if;

  insert into public.bids (auction_id, user_id, amount)
  values (p_auction_id, v_uid, p_amount)
  returning id into v_bid_id;

  -- anti-snipe
  v_remaining := extract(epoch from (v_a.end_at - now()))::int;
  v_new_end := v_a.end_at;
  if v_remaining < v_a.anti_snipe_window_seconds then
    v_new_end := now() + make_interval(secs => v_a.anti_snipe_extend_seconds);
  end if;

  update public.auctions
     set current_price = p_amount,
         end_at = v_new_end,
         updated_at = now()
   where id = p_auction_id;

  return query select v_bid_id, p_amount, v_new_end;
end;
$$;

revoke all on function public.place_bid(uuid, numeric) from public;
grant execute on function public.place_bid(uuid, numeric) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- RPC: cancel_auction (admin)
-- Restaura stock de la variante.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.cancel_auction(p_auction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_a public.auctions%rowtype;
begin
  if v_uid is null then
    raise exception 'login required' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'admin' then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select * into v_a from public.auctions where id = p_auction_id for update;
  if not found then
    raise exception 'auction not found';
  end if;

  if v_a.status <> 'active' then
    raise exception 'cannot cancel auction in status: %', v_a.status;
  end if;

  update public.auctions
     set status = 'cancelled', updated_at = now()
   where id = p_auction_id;

  update public.product_variants
     set stock = stock + 1
   where id = v_a.variant_id;
end;
$$;

revoke all on function public.cancel_auction(uuid) from public;
grant execute on function public.cancel_auction(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- RPC: finalize_expired_auctions
-- Marca subastas vencidas como 'ended' y asigna winner_user_id.
-- Si no hubo pujas, devuelve el stock al producto.
-- Idempotente: se puede llamar las veces que sea.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.finalize_expired_auctions()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_a record;
  v_winner uuid;
begin
  for v_a in
    select id, variant_id from public.auctions
    where status = 'active' and end_at <= now()
    for update skip locked
  loop
    select user_id into v_winner
    from public.bids
    where auction_id = v_a.id
    order by amount desc, created_at desc
    limit 1;

    if v_winner is null then
      update public.auctions
         set status = 'cancelled', updated_at = now()
       where id = v_a.id;
      update public.product_variants
         set stock = stock + 1
       where id = v_a.variant_id;
    else
      update public.auctions
         set status = 'ended', winner_user_id = v_winner, updated_at = now()
       where id = v_a.id;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.finalize_expired_auctions() from public;
grant execute on function public.finalize_expired_auctions() to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- RPC público: lista de subastas activas con info de producto y conteo de pujas
-- Útil para evitar joins desde el cliente.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.list_active_auctions()
returns table (
  id uuid,
  product_id uuid,
  variant_id uuid,
  product_title text,
  product_slug text,
  product_image text,
  size text,
  starting_price numeric,
  current_price numeric,
  min_increment numeric,
  start_at timestamptz,
  end_at timestamptz,
  bid_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.product_id,
    a.variant_id,
    p.title as product_title,
    p.slug as product_slug,
    coalesce((p.images->0->>'url')::text, '') as product_image,
    pv.size,
    a.starting_price,
    a.current_price,
    a.min_increment,
    a.start_at,
    a.end_at,
    (select count(*) from public.bids b where b.auction_id = a.id) as bid_count
  from public.auctions a
  join public.products p on p.id = a.product_id
  join public.product_variants pv on pv.id = a.variant_id
  where a.status = 'active' and a.end_at > now()
  order by a.end_at asc;
$$;

revoke all on function public.list_active_auctions() from public;
grant execute on function public.list_active_auctions() to anon, authenticated;
