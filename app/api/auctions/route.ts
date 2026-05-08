import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function firstImage(images: unknown): string {
  if (!Array.isArray(images) || images.length === 0) return '';
  const first = images[0] as { url?: string } | string | null | undefined;
  if (!first) return '';
  if (typeof first === 'string') return first;
  return typeof first?.url === 'string' ? first.url : '';
}

function buildAlias(first: string | null, last: string | null, phone: string | null): string {
  const f = (first || '').trim();
  const l = (last || '').trim();
  if (f) return l ? `${f} ${l[0].toUpperCase()}.` : f;
  if (phone) return `Pujador ${phone.slice(-4)}`;
  return 'Anónimo';
}

export async function GET() {
  const sb = service();

  // Mismo approach que /api/admin/auctions: sin llamar a finalize_expired_auctions
  // (que muta estado y no corresponde en un GET). Filtramos por activas y no vencidas.
  const nowIso = new Date().toISOString();
  const { data: auctions, error } = await sb
    .from('auctions')
    .select(`
      id, product_id, variant_id,
      starting_price, current_price, min_increment,
      start_at, end_at,
      product:products (title, slug, images),
      variant:product_variants (size)
    `)
    .eq('status', 'active')
    .gt('end_at', nowIso)
    .order('end_at', { ascending: true });

  if (error) {
    console.error('[AUCTIONS] list error:', error);
    return NextResponse.json({ error: 'No se pudo listar las subastas' }, { status: 500 });
  }

  const rows = auctions || [];
  const ids = rows.map((a) => a.id);

  // Misma query exacta que el admin para las pujas — devuelve todas las pujas
  // de las subastas activas con datos de contacto.
  type BidRow = {
    auction_id: string;
    amount: number;
    created_at: string;
    bidder_first_name: string | null;
    bidder_last_name: string | null;
    bidder_phone: string | null;
  };
  const countsByAuction: Record<string, number> = {};
  const maxByAuction: Record<string, number> = {};
  const topBidByAuction: Record<string, BidRow> = {};
  if (ids.length) {
    const { data: bids, error: bidsError } = await sb
      .from('bids')
      .select('auction_id, amount, created_at, bidder_first_name, bidder_last_name, bidder_phone')
      .in('auction_id', ids)
      .order('amount', { ascending: false })
      .order('created_at', { ascending: false });
    if (bidsError) {
      console.warn('[AUCTIONS] bids query warn:', bidsError);
    }
    (bids || []).forEach((b: any) => {
      countsByAuction[b.auction_id] = (countsByAuction[b.auction_id] || 0) + 1;
      const amount = Number(b.amount) || 0;
      if (!maxByAuction[b.auction_id] || amount > maxByAuction[b.auction_id]) {
        maxByAuction[b.auction_id] = amount;
      }
      // Como ya viene ordenado por amount desc, la primera por auction_id es la top.
      if (!topBidByAuction[b.auction_id]) {
        topBidByAuction[b.auction_id] = b as BidRow;
      }
    });
    console.log('[AUCTIONS] active:', ids.length, 'bids fetched:', (bids || []).length);
  }

  const mapped = rows.map((a: any) => {
    const product = Array.isArray(a.product) ? a.product[0] : a.product;
    const variant = Array.isArray(a.variant) ? a.variant[0] : a.variant;
    const tableCurrent = Number(a.current_price) || 0;
    const starting = Number(a.starting_price) || 0;
    const topBid = maxByAuction[a.id] || 0;
    const reconciledCurrent = Math.max(topBid, starting, tableCurrent);
    const top = topBidByAuction[a.id];
    return {
      id: a.id,
      product_id: a.product_id,
      variant_id: a.variant_id,
      product_title: product?.title || 'Producto',
      product_slug: product?.slug || '',
      product_image: firstImage(product?.images),
      size: variant?.size || '',
      starting_price: starting,
      current_price: reconciledCurrent,
      min_increment: Number(a.min_increment) || 0,
      start_at: a.start_at,
      end_at: a.end_at,
      bid_count: countsByAuction[a.id] || 0,
      top_bidder_alias: top
        ? buildAlias(top.bidder_first_name, top.bidder_last_name, top.bidder_phone)
        : null,
    };
  });

  return NextResponse.json(
    { auctions: mapped },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
