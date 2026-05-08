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

function buildAlias(first: string | null, last: string | null, phone: string | null): string {
  const f = (first || '').trim();
  const l = (last || '').trim();
  if (f) return l ? `${f} ${l[0].toUpperCase()}.` : f;
  if (phone) return `Pujador ${phone.slice(-4)}`;
  return 'Anónimo';
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

  // Misma query que el admin (que SÍ funciona): traemos la subasta directo
  // sin filtrar por status, sin llamar a finalize_expired_auctions (eso muta
  // estado y no debería correr en un GET — lo manejamos via cron/admin).
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

  // Misma query que el admin para las pujas — sin .limit() para evitar
  // cualquier comportamiento raro y para garantizar que devuelve TODO.
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
  console.log('[AUCTION DETAIL]', id, 'status:', (auction as any).status, 'bids:', bids.length);

  // Anonimización para vista pública
  const safeBids = bids.map((b: any) => ({
    id: b.id,
    alias: buildAlias(b.bidder_first_name, b.bidder_last_name, b.bidder_phone),
    amount: Number(b.amount),
    created_at: b.created_at,
  }));

  // Reconciliación de precio: max entre auctions.current_price, top bid, y starting
  const topBidAmount = safeBids[0]?.amount || 0;
  const startingPrice = Number((auction as any).starting_price) || 0;
  const tableCurrent = Number((auction as any).current_price) || 0;
  const reconciledCurrent = Math.max(topBidAmount, startingPrice, tableCurrent);

  const reconciledAuction = { ...(auction as any), current_price: reconciledCurrent };

  return NextResponse.json(
    {
      auction: reconciledAuction,
      bids: safeBids,
      bidCount: safeBids.length,
      topBidder: safeBids[0]
        ? { alias: safeBids[0].alias, amount: safeBids[0].amount }
        : null,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}
