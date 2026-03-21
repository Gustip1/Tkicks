import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const [{ data: activeRow }, { data: visibleRow }] = await Promise.all([
      supabase.from('settings').select('value').eq('key', 'giveaway_active').maybeSingle(),
      supabase.from('settings').select('value').eq('key', 'giveaway_visible').maybeSingle(),
    ]);

    const active = Boolean(activeRow?.value);
    // Si la clave no existe aún, la página es visible por defecto
    const visible = visibleRow === null ? true : Boolean(visibleRow?.value);
    return NextResponse.json({ active, visible, codeLength: 6 });
  } catch (error) {
    console.error('[ERROR] GET /api/sorteo/state:', error);
    return NextResponse.json({ active: false, codeLength: 6 });
  }
}
