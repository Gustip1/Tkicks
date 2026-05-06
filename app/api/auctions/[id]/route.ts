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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const sb = service();

  // cierre lazy
  await sb.rpc('finalize_expired_auctions');

  const { data: auction, error } = await sb
    .from('auctions')
    .select(`
      id, status, starting_price, current_price, min_increment,
      start_at, end_at, anti_snipe_window_seconds, anti_snipe_extend_seconds,
      winner_user_id,
      product:products (id, title, slug, description, images),
      variant:product_variants (id, size)
    `)
    .eq('id', id)
    .single();

  if (error || !auction) {
    return NextResponse.json({ error: 'Subasta no encontrada' }, { status: 404 });
  }

  const { data: bids } = await sb
    .from('bids')
    .select('id, user_id, amount, created_at')
    .eq('auction_id', id)
    .order('amount', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  // Anonimiza un poco a los pujadores: nombre desde profiles si existe, sino "Usuario"
  // (No vamos a exponer email ni user_id completo).
  const userIds = Array.from(new Set((bids || []).map((b) => b.user_id)));
  const aliasByUser: Record<string, string> = {};
  userIds.forEach((uid, i) => {
    aliasByUser[uid] = `Usuario ${uid.slice(0, 4).toUpperCase()}`;
  });

  const safeBids = (bids || []).map((b) => ({
    id: b.id,
    alias: aliasByUser[b.user_id] || 'Usuario',
    amount: Number(b.amount),
    created_at: b.created_at,
  }));

  return NextResponse.json({ auction, bids: safeBids, bidCount: safeBids.length });
}
