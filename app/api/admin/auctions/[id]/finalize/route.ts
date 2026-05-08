import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/admin/auctions/[id]/finalize
// Cierra manualmente una subasta activa marcandola como 'ended' con la
// puja mas alta como ganadora. Si no hay pujas, sugiere usar cancel.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Sólo admin' }, { status: 403 });
  }

  const sb = service();

  const { data: auction, error: fetchErr } = await sb
    .from('auctions')
    .select('id, status')
    .eq('id', id)
    .single();

  if (fetchErr || !auction) {
    return NextResponse.json({ error: 'Subasta no encontrada' }, { status: 404 });
  }

  if (auction.status !== 'active') {
    return NextResponse.json(
      { error: `Sólo se puede finalizar una subasta activa (estado actual: ${auction.status})` },
      { status: 400 }
    );
  }

  // Top bid (puja ganadora) — por id, no por user_id, para soportar pujas anónimas
  const { data: topBid, error: bidErr } = await sb
    .from('bids')
    .select('id, amount, user_id, bidder_first_name, bidder_last_name, bidder_phone')
    .eq('auction_id', id)
    .order('amount', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bidErr) {
    console.error('[ADMIN FINALIZE] bid query error:', bidErr);
    return NextResponse.json({ error: 'No se pudo leer la puja ganadora' }, { status: 500 });
  }

  if (!topBid) {
    return NextResponse.json(
      { error: 'No hay pujas. Usá Cancelar en lugar de Finalizar.' },
      { status: 400 }
    );
  }

  const { error: updErr } = await sb
    .from('auctions')
    .update({
      status: 'ended',
      winner_user_id: topBid.user_id, // null si la puja es anónima
      current_price: Number(topBid.amount),
      end_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updErr) {
    console.error('[ADMIN FINALIZE] update error:', updErr);
    return NextResponse.json({ error: 'No se pudo finalizar' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    winner: {
      first_name: topBid.bidder_first_name,
      last_name: topBid.bidder_last_name,
      phone: topBid.bidder_phone,
      amount: Number(topBid.amount),
    },
  });
}
