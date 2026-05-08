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

  // cierre lazy — best effort
  try {
    await sb.rpc('finalize_expired_auctions');
  } catch (e) {
    console.warn('[AUCTION DETAIL] finalize_expired_auctions warn:', e);
  }

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

  const { data: bids, error: bidsError } = await sb
    .from('bids')
    .select('id, amount, created_at, bidder_first_name, bidder_last_name, bidder_phone')
    .eq('auction_id', id)
    .order('amount', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  if (bidsError) {
    console.error('[AUCTION DETAIL] bids error:', bidsError);
  }

  console.log('[AUCTION DETAIL] auction', id, 'bids:', (bids || []).length);

  // Anonimización para la vista pública: nombre + inicial del apellido.
  const safeBids = (bids || []).map((b) => {
    const first = (b.bidder_first_name || '').trim();
    const last = (b.bidder_last_name || '').trim();
    let alias = 'Anónimo';
    if (first) {
      alias = last ? `${first} ${last[0].toUpperCase()}.` : first;
    } else if (b.bidder_phone) {
      alias = `Pujador ${(b.bidder_phone as string).slice(-4)}`;
    }
    return {
      id: b.id,
      alias,
      amount: Number(b.amount),
      created_at: b.created_at,
    };
  });

  // FUENTE ÚNICA DE VERDAD: el current_price mostrado se calcula a partir de
  // la puja más alta. Si la tabla auctions tiene un valor desincronizado
  // (porque se hizo un insert manual o una versión vieja de place_bid no la
  // actualizó), igual mostramos lo que realmente vale: max(top bid, salida).
  const topBidAmount = safeBids[0]?.amount || 0;
  const startingPrice = Number((auction as any).starting_price) || 0;
  const tableCurrent = Number((auction as any).current_price) || 0;
  const reconciledCurrent = Math.max(topBidAmount, startingPrice, tableCurrent);

  const reconciledAuction = { ...(auction as any), current_price: reconciledCurrent };

  return NextResponse.json(
    { auction: reconciledAuction, bids: safeBids, bidCount: safeBids.length },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
