import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sb = service();
  const { data: bids, error } = await sb
    .from('bids')
    .select('id, amount, created_at, bidder_first_name, bidder_last_name, bidder_phone')
    .eq('auction_id', id)
    .order('amount', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ADMIN AUCTION BIDS] list error:', error);
    return NextResponse.json({ error: 'No se pudieron listar las pujas' }, { status: 500 });
  }

  const enriched = (bids || []).map((b: any) => ({
    id: b.id,
    amount: Number(b.amount),
    created_at: b.created_at,
    contact: {
      first_name: b.bidder_first_name,
      last_name: b.bidder_last_name,
      phone: b.bidder_phone,
    },
  }));

  return NextResponse.json({ bids: enriched });
}
