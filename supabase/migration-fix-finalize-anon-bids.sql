-- Migration: corregir finalize_expired_auctions para pujas anónimas
--
-- Bug: la versión anterior hacía "select user_id into v_winner" y luego
-- "if v_winner is null → cancelar". Como las pujas anónimas tienen user_id
-- NULL, TODAS las subastas con pujas anónimas se marcaban como 'cancelled'
-- en lugar de 'ended', devolviendo el stock y perdiendo al ganador.
--
-- Fix: detectar si hay alguna puja (por id, no por user_id). Si hay puja,
-- marcar como 'ended'. Si no hay ninguna puja, marcar como 'cancelled'.

create or replace function public.finalize_expired_auctions()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_a record;
  v_top_bid record;
begin
  for v_a in
    select id, variant_id from public.auctions
    where status = 'active' and end_at <= now()
    for update skip locked
  loop
    -- Puja ganadora: la de mayor monto (puede ser anónima, user_id puede ser null)
    select id, user_id into v_top_bid
    from public.bids
    where auction_id = v_a.id
    order by amount desc, created_at desc
    limit 1;

    if v_top_bid.id is null then
      -- Sin pujas: cancelar y devolver stock
      update public.auctions
         set status = 'cancelled', updated_at = now()
       where id = v_a.id;
      update public.product_variants
         set stock = stock + 1
       where id = v_a.variant_id;
    else
      -- Hay puja ganadora (anónima o autenticada)
      update public.auctions
         set status = 'ended',
             winner_user_id = v_top_bid.user_id,
             updated_at = now()
       where id = v_a.id;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.finalize_expired_auctions() from public;
grant execute on function public.finalize_expired_auctions() to anon, authenticated, service_role;
