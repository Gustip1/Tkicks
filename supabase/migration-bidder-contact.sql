-- Migration: contact info for bidders
--
-- Antes de pujar, el usuario debe dejar nombre, apellido y teléfono.
-- Guardamos esos datos en `profiles` (un registro por usuario auth) y
-- modificamos `place_bid` para validarlos contra la base.

-- 1. Columnas nuevas en profiles
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone text;

-- 2. RLS: cada usuario puede insertar/actualizar su propio profile
-- (esto se necesita para que el front pueda guardar nombre/teléfono).
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- 3. place_bid ahora exige contact info
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
  v_first text;
  v_last text;
  v_phone text;
begin
  if v_uid is null then
    raise exception 'login required' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;

  -- Validar datos de contacto
  select first_name, last_name, phone
    into v_first, v_last, v_phone
  from public.profiles
  where id = v_uid;

  if v_first is null or btrim(v_first) = ''
     or v_last is null or btrim(v_last) = ''
     or v_phone is null or btrim(v_phone) = '' then
    raise exception 'contact info required' using errcode = 'P0001';
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

  -- Top bidder actual
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
