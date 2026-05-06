import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; bidId: string } }
) {
  const { id, bidId } = params;
  if (!UUID_RE.test(id) || !UUID_RE.test(bidId)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
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

  const { error } = await supabase.rpc('admin_delete_bid', { p_bid_id: bidId });
  if (error) {
    console.error('[ADMIN AUCTION BIDS] delete error:', error);
    return NextResponse.json(
      { error: error.message || 'No se pudo eliminar la puja' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
