import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Alta de un pedido: valida, toma el precio real de la base (nunca el del
 * navegador), aplica el cupón, guarda el pedido y descuenta el stock en una
 * sola operación. Lo usan /api/orders (efectivo, transferencia) y
 * /api/payments/card (tarjeta, que reserva el stock antes de cobrar).
 *
 * Siempre con el cliente de service role: el stock y los cupones no se tocan
 * con permisos públicos.
 */

export type OrderPaymentMethod = 'cash' | 'crypto_transfer' | 'installments_3' | 'card';

export interface OrderItemInput {
  productId: string;
  title: string;
  slug: string;
  price: number;
  size: string;
  quantity: number;
}

export interface OrderRequestBody {
  items: OrderItemInput[];
  fulfillment: 'pickup' | 'shipping';
  paymentMethod: OrderPaymentMethod;
  couponCode?: string | null;
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

export interface ResolvedItem {
  variantId: string;
  productId: string;
  title: string;
  slug: string;
  size: string;
  quantity: number;
  price: number;
}

export type CreateOrderResult =
  | {
      ok: true;
      order: { id: string; order_number: string | null };
      /** En dólares, ya con el cupón descontado */
      subtotal: number;
      discountAmount: number;
      couponCode: string | null;
      items: ResolvedItem[];
    }
  | { ok: false; status: number; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (status: number, error: string): CreateOrderResult => ({ ok: false, status, error });

/** Columnas que pueden faltar si todavía no se corrió su migración */
const OPTIONAL_COLUMNS = ['discount_code', 'discount_amount', 'payment_details'] as const;

// Postgres: 'column "x" of relation "orders" does not exist'; PostgREST: "Could not find the 'x' column"
function missingColumn(message: string | undefined): (typeof OPTIONAL_COLUMNS)[number] | null {
  const msg = message || '';
  if (!/does not exist|could not find/i.test(msg)) return null;
  return OPTIONAL_COLUMNS.find((c) => msg.includes(c)) ?? null;
}

/**
 * Inserta o actualiza un pedido. Si falta una columna opcional (migración
 * pendiente) reintenta sin ella en vez de romper el checkout entero.
 */
export async function writeOrder(
  supabase: SupabaseClient,
  payload: Record<string, any>,
  orderId?: string
): Promise<{ data: { id: string; order_number: string | null } | null; error: { message?: string } | null }> {
  let current = { ...payload };
  for (let attempt = 0; attempt <= OPTIONAL_COLUMNS.length; attempt++) {
    const query = orderId
      ? supabase.from('orders').update(current).eq('id', orderId).select('id, order_number').single()
      : supabase.from('orders').insert(current).select('id, order_number').single();
    const { data, error } = await query;
    const column = error ? missingColumn(error.message) : null;
    if (!column || !(column in current)) return { data: data as any, error };
    console.warn(`[ORDERS] Falta la columna ${column} en orders (migración pendiente). Reintentando sin ella.`);
    const { [column]: _dropped, ...rest } = current;
    current = rest;
  }
  return { data: null, error: { message: 'No se pudo guardar el pedido' } };
}

export function validateOrderBody(body: OrderRequestBody): string | null {
  if (!body.items || body.items.length === 0) return 'El carrito está vacío';
  if (!['pickup', 'shipping'].includes(body.fulfillment)) return 'Método de entrega inválido';
  // Efectivo solo al retirar en el showroom
  if (body.paymentMethod === 'cash' && body.fulfillment !== 'pickup') return 'Efectivo solo disponible para retiro en showroom';
  if (!body.contact?.firstName?.trim() || !body.contact?.email?.trim()) return 'Nombre y email son requeridos';

  // El envío necesita la dirección completa
  if (body.fulfillment === 'shipping') {
    if (!body.contact.lastName?.trim()) return 'Apellido requerido para envío';
    if (!body.contact.phone?.trim()) return 'Teléfono requerido para envío';
    if (!body.contact.document?.trim()) return 'Documento requerido para envío';
    if (!body.address?.postalCode?.trim()) return 'Código postal requerido';
    if (!body.address?.street?.trim()) return 'Dirección requerida';
  }

  for (const item of body.items) {
    if (!UUID.test(item.productId)) return 'ID de producto inválido';
    if (!(item.quantity >= 1)) return 'Cantidad inválida';
  }
  return null;
}

export async function createOrder(
  supabase: SupabaseClient,
  body: OrderRequestBody,
  extra: Record<string, any> = {}
): Promise<CreateOrderResult> {
  const invalid = validateOrderBody(body);
  if (invalid) return fail(400, invalid);

  // ── Stock disponible y precio real (de la base) de cada producto/talle ──
  const resolvedItems: ResolvedItem[] = [];

  for (const item of body.items) {
    const { data: variant, error: varErr } = await supabase
      .from('product_variants')
      .select('id, stock, products(price, sale_price, title, slug, active)')
      .eq('product_id', item.productId)
      .eq('size', item.size)
      .single();

    const product = (variant as any)?.products;

    if (varErr || !variant || !product || product.active === false) {
      return fail(400, `Talle ${item.size} no encontrado para ${item.title}`);
    }

    if (variant.stock < item.quantity) {
      return fail(400, `Stock insuficiente para ${item.title} talle ${item.size}. Disponible: ${variant.stock}`);
    }

    resolvedItems.push({
      variantId: variant.id,
      productId: item.productId,
      title: product.title,
      slug: product.slug,
      size: item.size,
      quantity: item.quantity,
      price: Number(product.sale_price ?? product.price),
    });
  }

  const grossSubtotal = resolvedItems.reduce((acc, it) => acc + it.price * it.quantity, 0);

  // ── Cupón (opcional): valida vigencia y máximo de usos y consume un uso, todo junto ──
  let discountAmount = 0;
  let appliedCouponCode: string | null = null;

  if (body.couponCode && body.couponCode.trim()) {
    const { data: redeemData, error: redeemErr } = await supabase.rpc('redeem_discount_code', {
      p_code: body.couponCode.trim(),
      p_subtotal: grossSubtotal,
    });
    const redeemRow = Array.isArray(redeemData) ? redeemData[0] : redeemData;

    if (redeemErr || !redeemRow?.ok) {
      return fail(400, redeemRow?.reason || 'No se pudo aplicar el cupón');
    }

    discountAmount = Number(redeemRow.discount_amount);
    appliedCouponCode = body.couponCode.trim().toUpperCase();
  }

  const subtotal = grossSubtotal - discountAmount;

  const releaseCoupon = async () => {
    if (appliedCouponCode) {
      await supabase.rpc('release_discount_code_use', { p_code: appliedCouponCode }).then(null, () => {});
    }
  };

  // ── Pedido ──
  const { data: order, error: orderErr } = await writeOrder(supabase, {
    status: 'draft',
    fulfillment: body.fulfillment,
    first_name: body.contact.firstName.trim(),
    last_name: body.contact.lastName?.trim() || null,
    email: body.contact.email.trim().toLowerCase(),
    phone: body.contact.phone?.trim() || null,
    document: body.contact.document?.trim() || null,
    subtotal,
    discount_code: appliedCouponCode,
    discount_amount: discountAmount,
    shipping_cost: 0,
    payment_method: body.paymentMethod,
    payment_status: 'pending',
    payment_alias: 'tkicks.sj',
    ...extra,
  });

  if (orderErr || !order) {
    console.error('[ORDERS] Error creating order:', orderErr);
    await releaseCoupon();
    return fail(500, 'Error al crear la orden');
  }

  // ── Productos del pedido (con el precio del servidor) ──
  const { error: itemsErr } = await supabase.from('order_items').insert(
    resolvedItems.map((it) => ({
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
    await supabase.from('orders').delete().eq('id', order.id);
    await releaseCoupon();
    return fail(500, 'Error al registrar los productos');
  }

  // ── Dirección de envío ──
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

  // ── Descuenta el stock de todo el pedido junto (si falta algo, no descuenta nada) ──
  const { error: stockErr } = await supabase.rpc('process_order_stock', { p_order_id: order.id });

  if (stockErr) {
    console.error(`[ORDERS] Stock processing failed for order ${order.id}:`, stockErr);
    // Se borra el pedido (arrastra productos y dirección) y se devuelve el uso del cupón
    await supabase.from('orders').delete().eq('id', order.id);
    await releaseCoupon();
    return fail(409, 'El stock cambió mientras confirmábamos tu pedido. Actualizá el carrito e intentá de nuevo.');
  }

  return { ok: true, order, subtotal, discountAmount, couponCode: appliedCouponCode, items: resolvedItems };
}

/**
 * Deshace un pedido cuyo pago no se hizo: devuelve el stock, lo borra y libera
 * el uso del cupón. Solo para pedidos que nunca se cobraron.
 */
export async function discardOrder(supabase: SupabaseClient, orderId: string, couponCode: string | null) {
  const { error: restoreErr } = await supabase.rpc('restore_order_stock', { p_order_id: orderId });
  if (restoreErr) {
    // Sin devolver el stock no se borra: queda el pedido para revisarlo a mano
    console.error(`[ORDERS] No se pudo devolver el stock del pedido ${orderId}:`, restoreErr);
    await writeOrder(supabase, { status: 'cancelled', payment_status: 'rejected' }, orderId);
    return;
  }
  await supabase.from('orders').delete().eq('id', orderId);
  if (couponCode) {
    await supabase.rpc('release_discount_code_use', { p_code: couponCode }).then(null, () => {});
  }
}
