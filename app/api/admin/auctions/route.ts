import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'No autorizado' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') return { ok: false as const, status: 403, error: 'Sólo admin' };
  return { ok: true as const, user };
}

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sb = service();
  // Limpieza preventiva: cualquier subasta marcada como 'cancelled' que
  // hubiera quedado de versiones anteriores se elimina (con sus bids
  // por cascade). Solo queremos active/ended/paid en el panel.
  await sb.from('auctions').delete().eq('status', 'cancelled');

  const { data: auctions, error } = await sb
    .from('auctions')
    .select(`
      id, status, starting_price, current_price, min_increment,
      start_at, end_at, winner_user_id, winner_order_id, created_at,
      product:products (id, title, slug, images),
      variant:product_variants (id, size)
    `)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ADMIN AUCTIONS] list error:', error);
    return NextResponse.json({ error: 'No se pudo listar' }, { status: 500 });
  }

  type BidContact = {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  };

  const ids = (auctions || []).map((a) => a.id);
  const countsByAuction: Record<string, number> = {};
  const topBidByAuction: Record<string, BidContact> = {};
  if (ids.length) {
    const { data: bids } = await sb
      .from('bids')
      .select('auction_id, amount, created_at, bidder_first_name, bidder_last_name, bidder_phone')
      .in('auction_id', ids)
      .order('amount', { ascending: false })
      .order('created_at', { ascending: false });
    (bids || []).forEach((b: any) => {
      countsByAuction[b.auction_id] = (countsByAuction[b.auction_id] || 0) + 1;
      if (!topBidByAuction[b.auction_id]) {
        topBidByAuction[b.auction_id] = {
          first_name: b.bidder_first_name,
          last_name: b.bidder_last_name,
          phone: b.bidder_phone,
        };
      }
    });
  }

  const enriched = (auctions || []).map((a) => {
    const topBidContact = topBidByAuction[a.id] || null;
    return {
      ...a,
      bid_count: countsByAuction[a.id] || 0,
      top_bidder_user_id: null,
      // Para subastas finalizadas/pagadas el "ganador" es la puja más alta
      // (que coincide con la top, ya que ordenamos por amount desc).
      winner_contact:
        a.status === 'ended' || a.status === 'paid' ? topBidContact : null,
      top_bidder_contact: topBidContact,
    };
  });

  return NextResponse.json({ auctions: enriched });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const variantId = String(body?.variantId || '');
  const startingPrice = Number(body?.startingPrice);
  const durationHours = Number(body?.durationHours ?? 48);
  const minIncrement = Number(body?.minIncrement ?? 1000);
  const antiSnipeWindow = Number(body?.antiSnipeWindowSeconds ?? 120);
  const antiSnipeExtend = Number(body?.antiSnipeExtendSeconds ?? 300);

  if (!UUID_RE.test(variantId)) {
    return NextResponse.json({ error: 'variantId inválido' }, { status: 400 });
  }
  if (!Number.isFinite(startingPrice) || startingPrice < 0) {
    return NextResponse.json({ error: 'starting_price inválido' }, { status: 400 });
  }
  if (!Number.isFinite(durationHours) || durationHours <= 0 || durationHours > 24 * 30) {
    return NextResponse.json({ error: 'duration inválida' }, { status: 400 });
  }
  if (!Number.isFinite(minIncrement) || minIncrement <= 0) {
    return NextResponse.json({ error: 'min_increment inválido' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('create_auction', {
    p_variant_id: variantId,
    p_starting_price: startingPrice,
    p_duration_hours: durationHours,
    p_min_increment: minIncrement,
    p_anti_snipe_window_seconds: antiSnipeWindow,
    p_anti_snipe_extend_seconds: antiSnipeExtend,
  });

  if (error) {
    console.error('[ADMIN AUCTIONS] create error:', error);
    return NextResponse.json({ error: error.message || 'Error al crear subasta' }, { status: 400 });
  }

  return NextResponse.json({ auctionId: data });
}
