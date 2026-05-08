import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  const { data, error } = await sb.rpc('place_bid', {
    p_auction_id: id,
    p_amount: amount,
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
  });

  if (error) {
    const msg = String(error.message || '');
    console.error('[BIDS POST] place_bid error:', { msg, code: error.code, hint: (error as any).hint });
    let userMsg = 'No se pudo registrar la puja';
    if (msg.includes('auction not active')) userMsg = 'La subasta no está activa';
    else if (msg.includes('auction ended')) userMsg = 'La subasta ya finalizó';
    else if (msg.includes('bid below minimum'))
      userMsg = msg.replace('bid below minimum:', 'Mínimo requerido:');
    else if (msg.includes('already top bidder')) userMsg = 'Ya sos el mejor postor';
    else if (msg.includes('contact info required'))
      userMsg = 'Completá nombre, apellido y teléfono';
    else if (msg.includes('contact too long')) userMsg = 'Datos demasiado largos';
    else if (msg.includes('auction not found')) userMsg = 'Subasta inexistente';
    // Si la firma del RPC no existe, casi seguro falta correr la migración
    else if (msg.includes('function') && msg.includes('does not exist')) {
      userMsg = 'Faltó aplicar la migración place_bid en Supabase. Avisale al admin.';
    }
    return NextResponse.json({ error: userMsg, debug: msg }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    bidId: row?.bid_id,
    currentPrice: Number(row?.new_current_price),
    endAt: row?.new_end_at,
  });
}
