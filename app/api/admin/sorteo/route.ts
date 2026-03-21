import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Winner = {
  first_name?: string;
  last_name?: string;
  phone: string;
  created_at: string;
  source_path?: string;
};

async function isAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

function getService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const service = getService();

    const [{ data: activeRow }, { data: visibleRow }, { data: winnersRow }] = await Promise.all([
      service.from('settings').select('value').eq('key', 'giveaway_active').maybeSingle(),
      service.from('settings').select('value').eq('key', 'giveaway_visible').maybeSingle(),
      service.from('settings').select('value').eq('key', 'giveaway_winners').maybeSingle(),
    ]);

    const winners: Winner[] = Array.isArray(winnersRow?.value)
      ? (winnersRow?.value as Winner[])
      : [];

    return NextResponse.json({
      active: Boolean(activeRow?.value),
      visible: visibleRow === null ? true : Boolean(visibleRow?.value),
      winners,
      code: '260705',
    });
  } catch (error) {
    console.error('[ERROR] GET /api/admin/sorteo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const service = getService();

    // Puede venir { active: bool } o { visible: bool } por separado
    if ('visible' in body) {
      const visible = Boolean(body.visible);
      const { error } = await service.from('settings').upsert(
        { key: 'giveaway_visible', value: visible },
        { onConflict: 'key' }
      );
      if (error) {
        console.error('[ERROR] upsert giveaway_visible:', error);
        return NextResponse.json({ error: 'No se pudo actualizar la visibilidad' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, visible });
    }

    const active = Boolean(body?.active);
    const { error } = await service.from('settings').upsert(
      { key: 'giveaway_active', value: active },
      { onConflict: 'key' }
    );

    if (error) {
      console.error('[ERROR] upsert giveaway_active:', error);
      return NextResponse.json({ error: 'No se pudo actualizar el estado del sorteo' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, active });
  } catch (error) {
    console.error('[ERROR] POST /api/admin/sorteo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
