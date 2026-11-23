-- Popup de cupón por WhatsApp (nov 2026)
-- Quien deja su número en el popup queda guardado acá, con el cupón que se le
-- dio y si el WhatsApp salió solo, falló o el código se mostró en pantalla.
--
-- Va después de migration-cupones-reglas.sql. Se puede correr más de una vez.

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  -- El número como lo escribió la persona
  phone text not null,
  -- El mismo número en formato de WhatsApp (549…): uno por persona
  wa_number text not null unique,
  coupon_code text,
  source text not null default 'popup',
  -- sent: WhatsApp aceptó el mensaje · failed: el envío falló y el código se
  -- mostró en pantalla · shown: sin envío automático, se mostró en pantalla
  status text not null default 'pending',
  wa_message_id text,
  wa_error text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unsubscribed_at timestamptz
);

alter table public.subscribers drop constraint if exists subscribers_status_check;
alter table public.subscribers add constraint subscribers_status_check
  check (status in ('pending', 'sent', 'failed', 'shown'));

create index if not exists subscribers_created_idx on public.subscribers (created_at desc);

-- Solo el admin la ve; la web escribe desde el servidor (service role)
alter table public.subscribers enable row level security;

drop policy if exists "subscribers_admin_all" on public.subscribers;
create policy "subscribers_admin_all" on public.subscribers
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

revoke all on public.subscribers from anon;

-- Qué cupón entrega el popup. Va en el cupón (tabla privada) y no en settings,
-- que se lee con la clave pública: el código no tiene que poder verse sin
-- dejar el número. Como mucho uno a la vez.
alter table public.discount_codes add column if not exists popup boolean not null default false;
create unique index if not exists discount_codes_one_popup on public.discount_codes ((true)) where popup;
