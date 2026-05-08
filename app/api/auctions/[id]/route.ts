import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function buildAlias(first: string | null, last: string | null, phone: string | null): string {
  const f = (first || '').trim();
  const l = (last || '').trim();
  if (f) return l ? `${f} ${l[0].toUpperCase()}.` : f;
  if (phone) return `Pujador ${phone.slice(-4)}`;
  return 'Anónimo';
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, proxy-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const sb = service();

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
    console.error('[AUCTION DETAIL] auction not found:', id, error);
    return NextResponse.json({ error: 'Subasta no encontrada' }, { status: 404 });
  }

  // ÚNICA FUENTE DE VERDAD: bids. Mismo query exacto que el admin.
  const { data: rawBids, error: bidsError } = await sb
    .from('bids')
    .select('id, amount, created_at, bidder_first_name, bidder_last_name, bidder_phone')
    .eq('auction_id', id)
    .order('amount', { ascending: false })
    .order('created_at', { ascending: false });

  if (bidsError) {
    console.error('[AUCTION DETAIL] bids error:', bidsError);
  }

  const bids = rawBids || [];

  const safeBids = bids.map((b: any) => ({
    id: b.id,
    alias: buildAlias(b.bidder_first_name, b.bidder_last_name, b.bidder_phone),
    amount: Number(b.amount),
    created_at: b.created_at,
  }));

  // El precio mostrado se DERIVA exclusivamente de bids (igual que el admin).
  // Si no hay pujas, fallback al starting_price. NO mezclamos con
  // auctions.current_price para evitar desync entre las dos tablas.
  const startingPrice = Number((auction as any).starting_price) || 0;
  const topBidAmount = safeBids[0]?.amount || 0;
  const displayedPrice = topBidAmount > 0 ? topBidAmount : startingPrice;

  console.log(
    '[AUCTION DETAIL]', id,
    'status:', (auction as any).status,
    'bids:', safeBids.length,
    'topBid:', topBidAmount,
    'displayed:', displayedPrice,
    'tableCurrent:', (auction as any).current_price
  );

  // Sustituimos current_price por el derivado de bids — el frontend NO debe
  // confiar en auctions.current_price para mostrar.
  const reconciledAuction = { ...(auction as any), current_price: displayedPrice };

  return NextResponse.json(
    {
      auction: reconciledAuction,
      bids: safeBids,
      bidCount: safeBids.length,
      topBidder: safeBids[0]
        ? { alias: safeBids[0].alias, amount: safeBids[0].amount }
        : null,
      _serverTime: new Date().toISOString(),
    },
    { headers: NO_CACHE_HEADERS }
  );
}
