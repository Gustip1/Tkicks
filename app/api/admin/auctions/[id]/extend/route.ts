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

// PATCH /api/admin/auctions/[id]/extend
// Body: { newEndAt?: ISO string, addHours?: number }
// Modifica el end_at de una subasta activa. Permite o setear una fecha
// nueva (newEndAt) o agregar horas al end_at actual (addHours).
export async function PATCH(
  req: NextRequest,
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

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const newEndAt = body?.newEndAt as string | undefined;
  const addHours = Number(body?.addHours);

  const sb = service();

  const { data: auction, error: fetchErr } = await sb
    .from('auctions')
    .select('id, status, end_at')
    .eq('id', id)
    .single();

  if (fetchErr || !auction) {
    return NextResponse.json({ error: 'Subasta no encontrada' }, { status: 404 });
  }

  if (auction.status !== 'active') {
    return NextResponse.json(
      { error: `No se puede modificar el tiempo (estado: ${auction.status})` },
      { status: 400 }
    );
  }

  let endAtIso: string;
  if (typeof newEndAt === 'string' && newEndAt.length > 0) {
    const d = new Date(newEndAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'newEndAt inválido' }, { status: 400 });
    }
    if (d.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'La nueva fecha debe ser futura' }, { status: 400 });
    }
    endAtIso = d.toISOString();
  } else if (Number.isFinite(addHours) && addHours !== 0) {
    if (addHours < -24 * 30 || addHours > 24 * 30) {
      return NextResponse.json({ error: 'addHours fuera de rango (-720..720)' }, { status: 400 });
    }
    const base = new Date(auction.end_at).getTime();
    const next = base + addHours * 3600 * 1000;
    if (next <= Date.now()) {
      return NextResponse.json({ error: 'El nuevo end_at quedaría en el pasado' }, { status: 400 });
    }
    endAtIso = new Date(next).toISOString();
  } else {
    return NextResponse.json(
      { error: 'Debés enviar newEndAt (ISO) o addHours (número)' },
      { status: 400 }
    );
  }

  const { error: updErr } = await sb
    .from('auctions')
    .update({ end_at: endAtIso, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updErr) {
    console.error('[ADMIN EXTEND] update error:', updErr);
    return NextResponse.json({ error: 'No se pudo actualizar end_at' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, endAt: endAtIso });
}
