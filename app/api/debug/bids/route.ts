import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint de diagnóstico — devuelve cuántas filas ve la API en `bids`
 * y `auctions`. Si la API ve 0 bids cuando vos sabés que hay, es un
 * problema de role/RLS/grants.
 *
 * Pegale a /api/debug/bids desde el browser para ver el output.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Faltan env vars', hasUrl: !!url, hasServiceKey: !!serviceKey },
      { status: 500 }
    );
  }

  const sb = createClient(url, serviceKey);

  // bids
  const { count: bidsCount, error: bidsError } = await sb
    .from('bids')
    .select('*', { count: 'exact', head: true });

  const { data: bidsSample, error: bidsSampleError } = await sb
    .from('bids')
    .select('id, auction_id, amount, bidder_first_name, bidder_last_name, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  // auctions
  const { count: auctionsCount, error: auctionsError } = await sb
    .from('auctions')
    .select('*', { count: 'exact', head: true });

  const { data: auctionsSample } = await sb
    .from('auctions')
    .select('id, status, current_price, starting_price')
    .eq('status', 'active')
    .limit(5);

  // Heurística para detectar si la key es anon (jwt con role:anon)
  let serviceKeyRole: string | null = null;
  try {
    const parts = serviceKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );
      serviceKeyRole = payload?.role || null;
    }
  } catch {
    /* noop */
  }

  return NextResponse.json({
    env: {
      hasUrl: !!url,
      hasServiceKey: !!serviceKey,
      hasAnonKey: !!anonKey,
      serviceKeyRole, // si esto dice "anon" en lugar de "service_role" → ¡ahí está el bug!
    },
    bids: {
      total: bidsCount,
      error: bidsError?.message || null,
      sampleError: bidsSampleError?.message || null,
      sample: bidsSample,
    },
    auctions: {
      total: auctionsCount,
      error: auctionsError?.message || null,
      activeSample: auctionsSample,
    },
  });
}
