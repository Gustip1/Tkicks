import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OrderItemInput {
  productId: string;
  title: string;
  slug: string;
  price: number;
  size: string;
  quantity: number;
}

interface OrderRequestBody {
  items: OrderItemInput[];
  fulfillment: 'pickup' | 'shipping';
  paymentMethod: 'cash' | 'crypto_transfer' | 'installments_3';
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    document: string;
  };
  address: {
    street: string;
    number: string;
    unit: string;
    city: string;
    province: string;
    postalCode: string;
    notes: string;
  } | null;
}

export async function POST(req: NextRequest) {
  try {
    const body: OrderRequestBody = await req.json();

    // ── Validation ──
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
    }

    if (!['pickup', 'shipping'].includes(body.fulfillment)) {
      return NextResponse.json({ error: 'Método de entrega inválido' }, { status: 400 });
    }

    if (!['cash', 'crypto_transfer', 'installments_3'].includes(body.paymentMethod)) {
      return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 });
    }

    // Cash only available for pickup
    if (body.paymentMethod === 'cash' && body.fulfillment !== 'pickup') {
      return NextResponse.json({ error: 'Efectivo solo disponible para retiro en showroom' }, { status: 400 });
    }

    if (!body.contact?.firstName?.trim() || !body.contact?.email?.trim()) {
      return NextResponse.json({ error: 'Nombre y email son requeridos' }, { status: 400 });
    }

    // Shipping requires full address
    if (body.fulfillment === 'shipping') {
      if (!body.contact.lastName?.trim()) return NextResponse.json({ error: 'Apellido requerido para envío' }, { status: 400 });
      if (!body.contact.phone?.trim()) return NextResponse.json({ error: 'Teléfono requerido para envío' }, { status: 400 });
      if (!body.contact.document?.trim()) return NextResponse.json({ error: 'Documento requerido para envío' }, { status: 400 });
      if (!body.address?.postalCode?.trim()) return NextResponse.json({ error: 'Código postal requerido' }, { status: 400 });
      if (!body.address?.street?.trim()) return NextResponse.json({ error: 'Dirección requerida' }, { status: 400 });
    }

    // Validate item data
    for (const item of body.items) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(item.productId)) {
        return NextResponse.json({ error: 'ID de producto inválido' }, { status: 400 });
      }
      if (item.quantity < 1) {
        return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 });
      }
    }

    // ── Use service role for stock operations (bypass RLS) ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRole);

    // ── Verify stock availability for each item/size ──
    for (const item of body.items) {
      const { data: variant, error: varErr } = await supabase
        .from('product_variants')
        .select('id, stock')
        .eq('product_id', item.productId)
        .eq('size', item.size)
        .single();

      if (varErr || !variant) {
        return NextResponse.json(
          { error: `Talle ${item.size} no encontrado para ${item.title}` },
          { status: 400 }
        );
      }

      if (variant.stock < item.quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente para ${item.title} talle ${item.size}. Disponible: ${variant.stock}` },
          { status: 400 }
        );
      }
    }

    // ── Calculate subtotal ──
    const subtotal = body.items.reduce((acc, it) => acc + it.price * it.quantity, 0);

    // ── Create order ──
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        status: body.paymentMethod === 'cash' ? 'draft' : 'draft',
        fulfillment: body.fulfillment,
        first_name: body.contact.firstName.trim(),
        last_name: body.contact.lastName?.trim() || null,
        email: body.contact.email.trim().toLowerCase(),
        phone: body.contact.phone?.trim() || null,
        document: body.contact.document?.trim() || null,
        subtotal,
        shipping_cost: 0,
        payment_method: body.paymentMethod,
        payment_status: body.paymentMethod === 'cash' ? 'pending' : 'pending',
        payment_alias: 'gus.p21',
      })
      .select('id, order_number')
      .single();

    if (orderErr || !order) {
      console.error('[ORDERS] Error creating order:', orderErr);
      return NextResponse.json({ error: 'Error al crear la orden' }, { status: 500 });
    }

    // ── Create order items ──
    const { error: itemsErr } = await supabase.from('order_items').insert(
      body.items.map((it) => ({
        order_id: order.id,
        product_id: it.productId,
        title: it.title,
        slug: it.slug,
        price: it.price,
        size: it.size,
        quantity: it.quantity,
      }))
    );

    if (itemsErr) {
      console.error('[ORDERS] Error creating order items:', itemsErr);
      // Cleanup: delete the order
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: 'Error al registrar los productos' }, { status: 500 });
    }

    // ── Create shipping address if needed ──
    if (body.fulfillment === 'shipping' && body.address) {
      await supabase.from('shipping_addresses').insert({
        order_id: order.id,
        street: body.address.street?.trim() || null,
        number: body.address.number?.trim() || null,
        unit: body.address.unit?.trim() || null,
        city: body.address.city?.trim() || null,
        province: body.address.province?.trim() || null,
        postal_code: body.address.postalCode?.trim() || null,
        notes: body.address.notes?.trim() || null,
      });
    }

    // ── Decrement stock for each variant/size ──
    for (const item of body.items) {
      const { error: stockErr } = await supabase.rpc('decrement_variant_stock', {
        p_variant_id: await getVariantId(supabase, item.productId, item.size),
        p_quantity: item.quantity,
      });

      if (stockErr) {
        console.error(`[ORDERS] Stock decrement failed for ${item.title} size ${item.size}:`, stockErr);
        // The order is already created, so we log but don't fail
        // In production, you'd want a transaction here
      }
    }

    console.info(`[ORDERS] Order created: ${order.id} (${body.paymentMethod})`);

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (err: any) {
    console.error('[ORDERS] Unexpected error:', err);
    return NextResponse.json({ error: 'Error inesperado al procesar la orden' }, { status: 500 });
  }
}

async function getVariantId(supabase: any, productId: string, size: string): Promise<string> {
  const { data } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId)
    .eq('size', size)
    .single();
  return data?.id;
}
