import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount inválido' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Tenés que iniciar sesión para pujar' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('place_bid', {
    p_auction_id: id,
    p_amount: amount,
  });

  if (error) {
    // Mapeo de errores comunes al mensaje del usuario
    const msg = String(error.message || '');
    let userMsg = 'No se pudo registrar la puja';
    if (msg.includes('auction not active')) userMsg = 'La subasta no está activa';
    else if (msg.includes('auction ended')) userMsg = 'La subasta ya finalizó';
    else if (msg.includes('bid below minimum')) userMsg = msg.replace('bid below minimum:', 'Mínimo requerido:');
    else if (msg.includes('already top bidder')) userMsg = 'Ya sos el mejor postor';
    else if (msg.includes('login required')) userMsg = 'Tenés que iniciar sesión';
    else if (msg.includes('contact info required')) userMsg = 'Completá tu nombre, apellido y teléfono antes de pujar';
    return NextResponse.json({ error: userMsg }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    bidId: row?.bid_id,
    currentPrice: Number(row?.new_current_price),
    endAt: row?.new_end_at,
  });
}
