import { NextResponse } from 'next/server';
import { getServerProfile } from '@/lib/supabase/server';
import { checkInstagramToken } from '@/lib/instagram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * Prueba contra Instagram el token guardado, para que /admin/ajustes diga si
 * funciona. Antes decía "Token guardado" aunque Instagram lo rechazara.
 */
export async function POST() {
  const { profile } = await getServerProfile();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  return NextResponse.json(await checkInstagramToken());
}
