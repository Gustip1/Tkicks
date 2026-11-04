-- ================================================================
-- Datos privados en settings (noviembre 2026)
-- Ejecutar en Supabase → SQL Editor. Se puede correr más de una vez.
--
-- La tabla settings se podía leer entera con la clave pública de la web,
-- incluidos el token de Instagram y los nombres y teléfonos de los
-- ganadores del sorteo. Esas dos filas pasan a ser solo para el admin
-- (por la política "admin write settings") y para el servidor. El resto
-- de la tabla sigue siendo público porque lo usa la tienda.
-- ================================================================

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'settings' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.settings', p.policyname);
  end loop;
end $$;

create policy "read settings" on public.settings
  for select
  using (key not in ('instagram_access_token', 'giveaway_winners'));
