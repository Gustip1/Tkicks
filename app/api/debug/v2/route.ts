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

export async function GET() {
  const sb = service();

  // 1. Todas las pujas (sin filtro)
  const { data: allBids, error: allBidsErr } = await sb
    .from('bids')
    .select('id, auction_id, amount, bidder_first_name, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  // 2. Todas las subastas (sin filtro de status)
  const { data: allAuctions, error: allAuctionsErr } = await sb
    .from('auctions')
    .select('id, status, current_price, starting_price, end_at')
    .order('created_at', { ascending: false })
    .limit(20);

  // 3. Subastas activas (lo que ve la página de listado)
  const nowIso = new Date().toISOString();
  const { data: activeAuctions, error: activeErr } = await sb
    .from('auctions')
    .select('id, status, current_price, starting_price, end_at')
    .eq('status', 'active')
    .gt('end_at', nowIso);

  const activeIds = (activeAuctions || []).map((a: any) => a.id);

  // 4. Pujas para las subastas activas (lo que hace el listado)
  let bidsForActive: any[] = [];
  let bidsForActiveErr: any = null;
  if (activeIds.length > 0) {
    const res = await sb
      .from('bids')
      .select('auction_id, amount')
      .in('auction_id', activeIds);
    bidsForActive = res.data || [];
    bidsForActiveErr = res.error;
  }

  // 5. Para cada subasta con pujas, consulta directa por auction_id
  const bidsByAuction: Record<string, any> = {};
  const uniqueAuctionIds = [...new Set((allBids || []).map((b: any) => b.auction_id))];
  for (const aid of uniqueAuctionIds) {
    const { data, error } = await sb
      .from('bids')
      .select('id, amount')
      .eq('auction_id', aid);
    bidsByAuction[aid] = { count: (data || []).length, error: error?.message };
  }

  return NextResponse.json({
    now: nowIso,
    allBids: { count: (allBids || []).length, error: allBidsErr?.message, rows: allBids },
    allAuctions: { count: (allAuctions || []).length, error: allAuctionsErr?.message, rows: allAuctions },
    activeAuctions: { count: (activeAuctions || []).length, error: activeErr?.message, ids: activeIds },
    bidsForActive: { count: bidsForActive.length, error: bidsForActiveErr?.message, rows: bidsForActive },
    bidsByAuction,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
