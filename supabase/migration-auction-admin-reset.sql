-- Migration: admin_reset_auction
--
-- Permite al admin reiniciar el precio de una subasta y borrar las pujas
-- existentes (útil cuando un usuario hizo una puja inválida o se quiere
-- empezar de cero sin perder la subasta).

create or replace function public.admin_reset_auction(
  p_auction_id uuid,
  p_new_starting_price numeric,
  p_new_min_increment numeric default null
) returns void
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

  if p_new_starting_price is null or p_new_starting_price < 0 then
    raise exception 'invalid new_starting_price';
  end if;

  if p_new_min_increment is not null and p_new_min_increment <= 0 then
    raise exception 'invalid new_min_increment';
  end if;

  select * into v_a from public.auctions where id = p_auction_id for update;
  if not found then
    raise exception 'auction not found';
  end if;

  if v_a.status not in ('active', 'ended') then
    raise exception 'cannot reset auction in status: %', v_a.status;
  end if;

  -- Borrar pujas existentes
  delete from public.bids where auction_id = p_auction_id;

  -- Resetear la subasta
  update public.auctions
  set
    starting_price = p_new_starting_price,
    current_price  = p_new_starting_price,
    min_increment  = coalesce(p_new_min_increment, min_increment),
    winner_user_id = null,
    winner_order_id = null,
    status         = 'active',
    updated_at     = now()
  where id = p_auction_id;
end;
$$;

revoke all on function public.admin_reset_auction(uuid, numeric, numeric) from public;
grant execute on function public.admin_reset_auction(uuid, numeric, numeric) to authenticated;
