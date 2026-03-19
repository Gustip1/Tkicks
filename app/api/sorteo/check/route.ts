import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const GIVEAWAY_CODE = '260705';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body?.code || '').trim();

    if (!code) {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'giveaway_active')
      .maybeSingle();

    if (!Boolean(data?.value)) {
      return NextResponse.json({ error: 'El sorteo no está activo' }, { status: 400 });
    }

    if (code !== GIVEAWAY_CODE) {
      return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, valid: true });
  } catch (error) {
    console.error('[ERROR] POST /api/sorteo/check:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
