import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'No autorizado' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') return { ok: false as const, status: 403, error: 'Sólo admin' };
  return { ok: true as const };
}

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sb = service();
  const { data, error } = await sb
    .from('bids')
    .select(`
      id, auction_id, amount, created_at,
      bidder_first_name, bidder_last_name, bidder_phone,
      auction:auctions (
        id, status,
        product:products (title, slug),
        variant:product_variants (size)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[ADMIN RECENT BIDS] list error:', error);
    return NextResponse.json({ error: 'No se pudieron listar las pujas' }, { status: 500 });
  }

  const bids = (data || []).map((b: any) => {
    const a = Array.isArray(b.auction) ? b.auction[0] : b.auction;
    const product = a ? (Array.isArray(a.product) ? a.product[0] : a.product) : null;
    const variant = a ? (Array.isArray(a.variant) ? a.variant[0] : a.variant) : null;
    return {
      id: b.id,
      auction_id: b.auction_id,
      amount: Number(b.amount),
      created_at: b.created_at,
      bidder_first_name: b.bidder_first_name,
      bidder_last_name: b.bidder_last_name,
      bidder_phone: b.bidder_phone,
      auction_status: a?.status || null,
      product_title: product?.title || null,
      variant_size: variant?.size || null,
    };
  });

  return NextResponse.json({ bids });
}
