import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ContactInput {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  document?: string;
}

interface AddressInput {
  street?: string;
  number?: string;
  unit?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  notes?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const userClient = await createServerSupabase();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Tenés que iniciar sesión' }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const fulfillment = body?.fulfillment === 'shipping' ? 'shipping' : 'pickup';
  const contact: ContactInput = body?.contact || {};
  const address: AddressInput | null = fulfillment === 'shipping' ? (body?.address || null) : null;

  if (!contact.firstName?.trim() || !contact.email?.trim()) {
    return NextResponse.json({ error: 'Nombre y email son requeridos' }, { status: 400 });
  }
  if (fulfillment === 'shipping') {
    if (!address?.postalCode?.trim() || !address?.street?.trim()) {
      return NextResponse.json({ error: 'Dirección y código postal requeridos para envío' }, { status: 400 });
    }
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: auction, error: auctionErr } = await sb
    .from('auctions')
    .select(`
      id, status, current_price, winner_user_id, variant_id, winner_order_id,
      product:products (id, title, slug),
      variant:product_variants (size)
    `)
    .eq('id', id)
    .single();

  if (auctionErr || !auction) {
    return NextResponse.json({ error: 'Subasta no encontrada' }, { status: 404 });
  }
  if (auction.status !== 'ended') {
    return NextResponse.json({ error: 'La subasta no terminó o ya fue pagada' }, { status: 400 });
  }
  if (auction.winner_user_id !== user.id) {
    return NextResponse.json({ error: 'Sólo el ganador puede iniciar el pago' }, { status: 403 });
  }
  if (auction.winner_order_id) {
    return NextResponse.json({ orderId: auction.winner_order_id, alreadyExists: true });
  }

  const product: any = auction.product;
  const variant: any = auction.variant;
  const subtotal = Number(auction.current_price);

  const { data: order, error: orderErr } = await sb
    .from('orders')
    .insert({
      user_id: user.id,
      status: 'draft',
      fulfillment,
      first_name: contact.firstName.trim(),
      last_name: contact.lastName?.trim() || null,
      email: contact.email.trim().toLowerCase(),
      phone: contact.phone?.trim() || null,
      document: contact.document?.trim() || null,
      subtotal,
      shipping_cost: 0,
      payment_method: 'bank_transfer',
      payment_status: 'pending',
      payment_alias: 'gus.p21',
    })
    .select('id, order_number')
    .single();

  if (orderErr || !order) {
    console.error('[AUCTION CHECKOUT] order create:', orderErr);
    return NextResponse.json({ error: 'Error al crear la orden' }, { status: 500 });
  }

  const { error: itemErr } = await sb.from('order_items').insert({
    order_id: order.id,
    product_id: product.id,
    title: product.title,
    slug: product.slug,
    price: subtotal,
    size: variant?.size || '-',
    quantity: 1,
  });
  if (itemErr) {
    console.error('[AUCTION CHECKOUT] item create:', itemErr);
    await sb.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: 'Error al registrar el ítem' }, { status: 500 });
  }

  if (fulfillment === 'shipping' && address) {
    await sb.from('shipping_addresses').insert({
      order_id: order.id,
      street: address.street?.trim() || null,
      number: address.number?.trim() || null,
      unit: address.unit?.trim() || null,
      city: address.city?.trim() || null,
      province: address.province?.trim() || null,
      postal_code: address.postalCode?.trim() || null,
      notes: address.notes?.trim() || null,
    });
  }

  await sb
    .from('auctions')
    .update({ status: 'paid', winner_order_id: order.id })
    .eq('id', id);

  return NextResponse.json({ orderId: order.id, orderNumber: order.order_number });
}
