-- Migration: admin_delete_bid
--
-- Permite al admin eliminar una puja individual. Después de borrarla,
-- recalcula el current_price como el monto de la puja más alta que
-- todavía queda. Si no quedan pujas, vuelve al starting_price.
-- No toca end_at (la duración actual se mantiene).

create or replace function public.admin_delete_bid(
  p_bid_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_auction_id uuid;
  v_starting numeric;
  v_top_amount numeric;
begin
  if v_uid is null then
    raise exception 'login required' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'admin' then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- Tomar el bid + bloquear su auction.
  select auction_id into v_auction_id from public.bids where id = p_bid_id;
  if not found then
    raise exception 'bid not found';
  end if;

  select starting_price into v_starting
  from public.auctions
  where id = v_auction_id
  for update;
  if not found then
    raise exception 'auction not found';
  end if;

  -- Borrar la puja.
  delete from public.bids where id = p_bid_id;

  -- Tomar el nuevo top entre las pujas restantes.
  select amount into v_top_amount
  from public.bids
  where auction_id = v_auction_id
  order by amount desc, created_at desc
  limit 1;

  -- Actualizar precio actual: el del nuevo top o, si no hay pujas, el de salida.
  update public.auctions
     set current_price = coalesce(v_top_amount, v_starting),
         updated_at    = now()
   where id = v_auction_id;
end;
$$;

revoke all on function public.admin_delete_bid(uuid) from public;
grant execute on function public.admin_delete_bid(uuid) to authenticated;
