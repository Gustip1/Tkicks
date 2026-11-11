-- =====================================================================
-- Pago con tarjeta (Payway) y pedidos privados — nov 2026
-- Correr en Supabase → SQL Editor. Se puede correr más de una vez.
-- =====================================================================

-- 1. Detalle del pago con tarjeta en el pedido: cuotas, recargo, dólar usado,
--    monto cobrado en pesos, marca y últimos 4 de la tarjeta y la operación de
--    Payway. Nunca el número completo ni el código de seguridad.
alter table public.orders add column if not exists payment_details jsonb;

-- 2. Pedidos privados. Hasta ahora cualquiera podía leer y modificar los
--    pedidos con la clave pública que va en la web (nombre, email, teléfono,
--    DNI y dirección de cada cliente), y marcar un pedido como pagado. Los
--    pedidos se crean desde el servidor (service role), así que el público no
--    necesita ningún permiso: los ve el admin y cada cliente los suyos.
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('orders', 'order_items', 'shipping_addresses')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipping_addresses enable row level security;

create policy "orders: lee el admin o su cliente" on public.orders for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or (auth.uid() is not null and user_id = auth.uid())
    or (coalesce(auth.jwt() ->> 'email', '') <> '' and lower(email) = lower(auth.jwt() ->> 'email'))
  );

create policy "orders: modifica el admin" on public.orders for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "orders: borra el admin" on public.orders for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Productos y dirección: se ven si se ve el pedido (la política de orders aplica adentro)
create policy "order_items: con su pedido" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id));

create policy "order_items: admin" on public.order_items for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "shipping_addresses: con su pedido" on public.shipping_addresses for select
  using (exists (select 1 from public.orders o where o.id = order_id));

create policy "shipping_addresses: admin" on public.shipping_addresses for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- 3. Stock y cupones solo desde el servidor. Estas funciones saltean los
--    permisos (security definer) y estaban abiertas al público: cualquiera
--    podía sumar o restar stock, o gastar los usos de un cupón.
do $$
declare f text;
begin
  foreach f in array array[
    'public.decrement_variant_stock(uuid, integer)',
    'public.process_order_stock(uuid)',
    'public.restore_order_stock(uuid)',
    'public.redeem_discount_code(text, numeric)',
    'public.release_discount_code_use(text)'
  ]
  loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end $$;

-- Verificación (debería devolver 0 filas con la clave pública):
--   select id from public.orders limit 1;   -- como anon
