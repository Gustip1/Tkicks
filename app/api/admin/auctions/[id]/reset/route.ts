import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const newPrice = Number(body?.newStartingPrice);
  const newMinIncrement =
    body?.newMinIncrement != null && body?.newMinIncrement !== ''
      ? Number(body.newMinIncrement)
      : null;

  if (!Number.isFinite(newPrice) || newPrice < 0) {
    return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
  }
  if (newMinIncrement !== null && (!Number.isFinite(newMinIncrement) || newMinIncrement <= 0)) {
    return NextResponse.json({ error: 'Incremento inválido' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Sólo admin' }, { status: 403 });
  }

  const { error } = await supabase.rpc('admin_reset_auction', {
    p_auction_id: id,
    p_new_starting_price: newPrice,
    p_new_min_increment: newMinIncrement,
  });

  if (error) {
    console.error('[ADMIN AUCTIONS] reset error:', error);
    return NextResponse.json({ error: error.message || 'No se pudo reiniciar' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
