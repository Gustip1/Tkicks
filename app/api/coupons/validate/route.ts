import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { publicApiLimiter } from '@/lib/security/rate-limiter';
import { getClientIp } from '@/lib/security/get-client-ip';
import { CouponItem, couponSummary } from '@/lib/coupons';
import { checkCoupon, findCoupon } from '@/lib/orders/coupon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Vista previa del cupón en el checkout: dice si vale y cuánto descuenta, con
 * las mismas reglas que el alta del pedido (lib/coupons.ts). No consume el
 * uso: eso pasa, de forma atómica, al confirmar la compra.
 *
 * Los precios, la marca y la categoría de cada producto se leen de la base;
 * del navegador solo se toma qué productos hay en el carrito y cuántos.
 */
export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  if (publicApiLimiter.isBlocked(clientIp)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Probá de nuevo en un minuto.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const code = String(body?.code || '').trim();
  const subtotal = Number(body?.subtotal);

  if (!code) {
    return NextResponse.json({ error: 'Ingresá un código' }, { status: 400 });
  }
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return NextResponse.json({ error: 'Subtotal inválido' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const coupon = await findCoupon(supabase, code);

  publicApiLimiter.recordFailedAttempt(clientIp);

  if (!coupon) {
    return NextResponse.json({ error: 'Cupón no encontrado' }, { status: 404 });
  }

  // Productos del carrito, con los datos de la base
  const requested: { productId: string; quantity: number }[] = (Array.isArray(body?.items) ? body.items : [])
    .slice(0, 50)
    .map((it: any) => ({ productId: String(it?.productId || ''), quantity: Math.floor(Number(it?.quantity)) }))
    .filter((it: { productId: string; quantity: number }) => UUID.test(it.productId) && it.quantity >= 1);

  let items: CouponItem[];
  if (requested.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, price, sale_price, category, brand')
      .in('id', Array.from(new Set(requested.map((it) => it.productId))));
    const byId = new Map((products ?? []).map((p: any) => [p.id, p]));
    items = requested.flatMap((it) => {
      const p = byId.get(it.productId);
      if (!p) return [];
      const onSale = p.sale_price != null && Number(p.sale_price) > 0;
      return [{ price: Number(onSale ? p.sale_price : p.price), quantity: it.quantity, category: p.category, brand: p.brand, onSale }];
    });
  } else {
    // Sin detalle del carrito: se toma el subtotal como un solo producto sin marca ni categoría
    items = [{ price: subtotal, quantity: 1 }];
  }

  const paymentMethod = typeof body?.paymentMethod === 'string' ? body.paymentMethod : null;
  const result = await checkCoupon(supabase, coupon, {
    items,
    paymentMethod,
    customer: {
      email: typeof body?.email === 'string' ? body.email : null,
      document: typeof body?.document === 'string' ? body.document : null,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discountAmount: result.discount,
    // Para que el checkout avise si el medio de pago elegido no corresponde
    paymentScope: coupon.payment_scope ?? null,
    // Descuenta solo sobre parte del carrito (por marca, categoría u ofertas)
    partial: result.partial,
    headline: couponSummary(coupon).headline,
  });
}
