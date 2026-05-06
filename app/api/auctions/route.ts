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

export async function GET() {
  const sb = service();

  // Cierre lazy de subastas vencidas — best-effort, no falla la respuesta
  try {
    await sb.rpc('finalize_expired_auctions');
  } catch (e) {
    console.warn('[AUCTIONS] finalize_expired_auctions warn:', e);
  }

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

  let countsByAuction: Record<string, number> = {};
  if (ids.length) {
    const { data: bids, error: bidsError } = await sb
      .from('bids')
      .select('auction_id')
      .in('auction_id', ids);
    if (bidsError) {
      console.warn('[AUCTIONS] bid count warn:', bidsError);
    }
    countsByAuction = (bids || []).reduce<Record<string, number>>((acc, b) => {
      acc[b.auction_id] = (acc[b.auction_id] || 0) + 1;
      return acc;
    }, {});
  }

  const mapped = rows.map((a: any) => {
    const product = Array.isArray(a.product) ? a.product[0] : a.product;
    const variant = Array.isArray(a.variant) ? a.variant[0] : a.variant;
    return {
      id: a.id,
      product_id: a.product_id,
      variant_id: a.variant_id,
      product_title: product?.title || 'Producto',
      product_slug: product?.slug || '',
      product_image: firstImage(product?.images),
      size: variant?.size || '',
      starting_price: Number(a.starting_price) || 0,
      current_price: Number(a.current_price) || 0,
      min_increment: Number(a.min_increment) || 0,
      start_at: a.start_at,
      end_at: a.end_at,
      bid_count: countsByAuction[a.id] || 0,
    };
  });

  return NextResponse.json({ auctions: mapped });
}
