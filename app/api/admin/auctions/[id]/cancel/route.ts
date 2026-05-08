import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// "Cancelar" = borrar la subasta de la base. Los bids hacen cascade.
// Restauramos el stock de la variante. Asi no queda residuo de subastas
// canceladas en el panel.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Sólo admin' }, { status: 403 });
  }

  const sb = service();

  // 1. Buscar la subasta para saber qué variante restaurar y validar el estado
  const { data: auction, error: fetchErr } = await sb
    .from('auctions')
    .select('id, variant_id, status')
    .eq('id', id)
    .single();

  if (fetchErr || !auction) {
    return NextResponse.json({ error: 'Subasta no encontrada' }, { status: 404 });
  }

  // 2. Borrar la subasta (los bids hacen cascade automáticamente)
  const { error: delErr } = await sb.from('auctions').delete().eq('id', id);
  if (delErr) {
    console.error('[ADMIN CANCEL] delete error:', delErr);
    return NextResponse.json({ error: 'No se pudo eliminar la subasta' }, { status: 500 });
  }

  // 3. Restaurar stock de la variante (sólo si la subasta seguía activa —
  //    si ya estaba ended/paid el stock fue al ganador, no lo devolvemos).
  if (auction.status === 'active') {
    const { data: variant } = await sb
      .from('product_variants')
      .select('id, stock')
      .eq('id', auction.variant_id)
      .single();
    if (variant) {
      await sb
        .from('product_variants')
        .update({ stock: Number(variant.stock || 0) + 1 })
        .eq('id', auction.variant_id);
    }
  }

  return NextResponse.json({ ok: true, deleted: true });
}
