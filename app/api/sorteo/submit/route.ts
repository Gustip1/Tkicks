import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GIVEAWAY_CODE = '260705';

type Winner = {
  phone: string;
  created_at: string;
  source_path?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body?.code || '').trim();
    const phone = String(body?.phone || '').trim();
    const sourcePath = String(body?.sourcePath || '').trim();

    if (!code) {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
    }
    if (code !== GIVEAWAY_CODE) {
      return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 });
    }

    if (!phone || phone.length < 8) {
      return NextResponse.json({ error: 'Número de teléfono inválido' }, { status: 400 });
    }

    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: activeRow } = await service
      .from('settings')
      .select('value')
      .eq('key', 'giveaway_active')
      .maybeSingle();

    if (!Boolean(activeRow?.value)) {
      return NextResponse.json({ error: 'El sorteo no está activo' }, { status: 400 });
    }

    const { data: winnersRow } = await service
      .from('settings')
      .select('value')
      .eq('key', 'giveaway_winners')
      .maybeSingle();

    const winners: Winner[] = Array.isArray(winnersRow?.value)
      ? (winnersRow?.value as Winner[])
      : [];

    const normalizedPhone = phone.replace(/\s+/g, '');
    const alreadyExists = winners.some(
      (w) => w.phone.replace(/\s+/g, '') === normalizedPhone
    );

    if (alreadyExists) {
      return NextResponse.json({ ok: true, alreadyRegistered: true });
    }

    winners.unshift({
      phone,
      created_at: new Date().toISOString(),
      source_path: sourcePath || '/',
    });

    const { error: upsertError } = await service.from('settings').upsert(
      {
        key: 'giveaway_winners',
        value: winners,
      },
      { onConflict: 'key' }
    );

    if (upsertError) {
      console.error('[ERROR] upsert giveaway_winners:', upsertError);
      return NextResponse.json({ error: 'No se pudo registrar el ganador' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, winner: true });
  } catch (error) {
    console.error('[ERROR] POST /api/sorteo/submit:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
