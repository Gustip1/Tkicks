import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { publicApiLimiter } from '@/lib/security/rate-limiter';
import { getClientIp } from '@/lib/security/get-client-ip';
import { createOrder, OrderRequestBody } from '@/lib/orders/create';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Efectivo y transferencia. La tarjeta va por /api/payments/card */
const METHODS = ['cash', 'crypto_transfer', 'installments_3'];

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  if (publicApiLimiter.isBlocked(clientIp)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.' },
      { status: 429 }
    );
  }

  try {
    const body: OrderRequestBody = await req.json();

    if (!METHODS.includes(body.paymentMethod)) {
      return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 });
    }

    // Service role: el stock y los cupones no se tocan con permisos públicos
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const created = await createOrder(supabase, body);
    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: created.status });
    }

    console.info(`[ORDERS] Order created: ${created.order.id} (${body.paymentMethod})`);

    publicApiLimiter.recordFailedAttempt(clientIp);

    return NextResponse.json({
      orderId: created.order.id,
      orderNumber: created.order.order_number,
      discountAmount: created.discountAmount,
    });
  } catch (err: any) {
    console.error('[ORDERS] Unexpected error:', err);
    return NextResponse.json({ error: 'Error inesperado al procesar la orden' }, { status: 500 });
  }
}
