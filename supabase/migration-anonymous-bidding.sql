-- Migration: pujas anónimas
--
-- Las pujas dejan de requerir usuario autenticado. Cada puja viene
-- con nombre, apellido y teléfono incrustados en la propia fila de
-- `bids` (no se guarda nada en `profiles` para esto).
--
-- El admin puede ver el contacto real del pujador en cada fila.

-- 1. Hacer user_id opcional y sumar las nuevas columnas de contacto
alter table public.bids alter column user_id drop not null;
alter table public.bids add column if not exists bidder_first_name text;
alter table public.bids add column if not exists bidder_last_name text;
alter table public.bids add column if not exists bidder_phone text;

create index if not exists bids_created_desc_idx on public.bids (created_at desc);

-- 2. Reemplazar place_bid con la nueva firma (sin auth, con datos del pujador)
drop function if exists public.place_bid(uuid, numeric);

create or replace function public.place_bid(
  p_auction_id uuid,
  p_amount numeric,
  p_first_name text,
  p_last_name text,
  p_phone text
) returns table (bid_id uuid, new_current_price numeric, new_end_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a public.auctions%rowtype;
  v_min_required numeric;
  v_remaining int;
  v_new_end timestamptz;
  v_bid_id uuid;
  v_top_phone text;
  v_first text := btrim(coalesce(p_first_name, ''));
  v_last  text := btrim(coalesce(p_last_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;

  if v_first = '' or v_last = '' or v_phone = '' then
    raise exception 'contact info required' using errcode = 'P0001';
  end if;

  if length(v_first) > 80 or length(v_last) > 80 or length(v_phone) > 30 then
    raise exception 'contact too long';
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

  -- Top actual identificado por teléfono
  select bidder_phone into v_top_phone
  from public.bids
  where auction_id = p_auction_id
  order by amount desc, created_at desc
  limit 1;

  if v_top_phone is null then
    v_min_required := v_a.starting_price;
  else
    v_min_required := v_a.current_price + v_a.min_increment;
    if v_top_phone = v_phone then
      raise exception 'already top bidder';
    end if;
  end if;

  if p_amount < v_min_required then
    raise exception 'bid below minimum: % required', v_min_required;
  end if;

  insert into public.bids (
    auction_id, amount,
    bidder_first_name, bidder_last_name, bidder_phone
  )
  values (
    p_auction_id, p_amount,
    v_first, v_last, v_phone
  )
  returning id into v_bid_id;

  -- anti-snipe
  v_remaining := extract(epoch from (v_a.end_at - now()))::int;
  v_new_end := v_a.end_at;
  if v_remaining < v_a.anti_snipe_window_seconds then
    v_new_end := now() + make_interval(secs => v_a.anti_snipe_extend_seconds);
  end if;

  update public.auctions
     set current_price = p_amount,
         end_at        = v_new_end,
         updated_at    = now()
   where id = p_auction_id;

  return query select v_bid_id, p_amount, v_new_end;
end;
$$;

revoke all on function public.place_bid(uuid, numeric, text, text, text) from public;
grant execute on function public.place_bid(uuid, numeric, text, text, text) to anon, authenticated;
