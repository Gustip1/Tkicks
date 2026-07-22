import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { publicApiLimiter } from '@/lib/security/rate-limiter';
import { getClientIp } from '@/lib/security/get-client-ip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const clientIp = getClientIp(req);

  if (publicApiLimiter.isBlocked(clientIp)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.' },
      { status: 429 }
    );
  }

  const id = params.id;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const amount = Number(body?.amount);
  const firstName = clean(body?.firstName);
  const lastName = clean(body?.lastName);
  const phone = clean(body?.phone);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
  }
  if (!firstName || !lastName || !phone) {
    return NextResponse.json(
      { error: 'Completá nombre, apellido y teléfono' },
      { status: 400 }
    );
  }
  if (firstName.length > 80 || lastName.length > 80 || phone.length > 30) {
    return NextResponse.json({ error: 'Datos demasiado largos' }, { status: 400 });
  }

  const sb = service();

  // place_bid (supabase/migration-anonymous-bidding-v2.sql) hace la validación de
  // mínimo + inserción dentro de una sola transacción con `for update` sobre la
  // subasta, evitando que dos pujas simultáneas pasen el chequeo y pisen
  // current_price de forma inconsistente.
  const { data, error } = await sb.rpc('place_bid', {
    p_auction_id: id,
    p_amount: amount,
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
  });

  if (error) {
    const msg = error.message || '';
    console.error('[BIDS POST] place_bid error:', msg);

    if (msg.includes('auction not found')) {
      return NextResponse.json({ error: 'Subasta no encontrada' }, { status: 404 });
    }
    if (msg.includes('auction not active')) {
      return NextResponse.json({ error: 'La subasta no está activa' }, { status: 400 });
    }
    if (msg.includes('auction ended')) {
      return NextResponse.json({ error: 'La subasta ya finalizó' }, { status: 400 });
    }
    if (msg.includes('already top bidder')) {
      return NextResponse.json({ error: 'Ya sos el mejor postor' }, { status: 400 });
    }
    if (msg.includes('bid below minimum')) {
      const match = msg.match(/bid below minimum:\s*([\d.]+)/);
      return NextResponse.json(
        { error: match ? `Mínimo requerido: ${match[1]}` : 'El monto es menor al mínimo requerido' },
        { status: 400 }
      );
    }
    if (msg.includes('contact info required') || msg.includes('contact too long')) {
      return NextResponse.json({ error: 'Completá nombre, apellido y teléfono' }, { status: 400 });
    }
    if (msg.includes('invalid amount')) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    return NextResponse.json({ error: 'No se pudo registrar la puja', debug: msg }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return NextResponse.json({ error: 'No se pudo registrar la puja' }, { status: 500 });
  }

  publicApiLimiter.recordFailedAttempt(clientIp);

  console.log('[BIDS POST] ok', {
    auctionId: id,
    bidId: row.bid_id,
    amount: row.new_current_price,
  });

  return NextResponse.json({
    bidId: row.bid_id,
    currentPrice: row.new_current_price,
    endAt: row.new_end_at,
  });
}
