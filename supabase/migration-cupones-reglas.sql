-- Cupones con condiciones (nov 2026)
-- Compra mínima, tope, alcance por categoría o marca, sin ofertas, medio de
-- pago, un uso por cliente, primera compra y nota interna.
--
-- Se puede correr más de una vez. Los cupones que ya existen siguen
-- funcionando igual: todas las condiciones nuevas arrancan vacías.

alter table public.discount_codes
  add column if not exists min_subtotal numeric(12,2),
  add column if not exists max_discount numeric(12,2),
  add column if not exists once_per_customer boolean not null default false,
  add column if not exists first_purchase_only boolean not null default false,
  add column if not exists exclude_sale boolean not null default false,
  add column if not exists applies_category text,
  add column if not exists applies_brands text[],
  add column if not exists payment_scope text,
  add column if not exists note text;

alter table public.discount_codes drop constraint if exists discount_codes_min_subtotal_check;
alter table public.discount_codes add constraint discount_codes_min_subtotal_check
  check (min_subtotal is null or min_subtotal > 0);

alter table public.discount_codes drop constraint if exists discount_codes_max_discount_check;
alter table public.discount_codes add constraint discount_codes_max_discount_check
  check (max_discount is null or max_discount > 0);

alter table public.discount_codes drop constraint if exists discount_codes_category_check;
alter table public.discount_codes add constraint discount_codes_category_check
  check (applies_category is null or applies_category in ('sneakers', 'streetwear'));

alter table public.discount_codes drop constraint if exists discount_codes_payment_scope_check;
alter table public.discount_codes add constraint discount_codes_payment_scope_check
  check (payment_scope is null or payment_scope in ('transfer_cash', 'card'));

-- Un porcentaje nunca puede pasar de 100
alter table public.discount_codes drop constraint if exists discount_codes_percent_check;
alter table public.discount_codes add constraint discount_codes_percent_check
  check (type <> 'percent' or value <= 100) not valid;

-- Para buscar rápido si un cliente ya usó un cupón
create index if not exists orders_discount_code_idx on public.orders (discount_code) where discount_code is not null;

-- Consumir o devolver un uso lo hace solo el servidor (service role). Antes
-- cualquiera con la clave pública podía llamar a estas funciones y agotarle
-- los usos a un cupón sin comprar nada.
revoke all on function public.redeem_discount_code(text, numeric) from public, anon, authenticated;
grant execute on function public.redeem_discount_code(text, numeric) to service_role;
revoke all on function public.release_discount_code_use(text) from public, anon, authenticated;
grant execute on function public.release_discount_code_use(text) to service_role;
