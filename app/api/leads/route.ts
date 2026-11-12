import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { leadLimiter } from '@/lib/security/rate-limiter';
import { getClientIp } from '@/lib/security/get-client-ip';
import { validateLead } from '@/lib/leads';

export const dynamic = 'force-dynamic';

/** De qué navegador vino: sirve para saber cuántas consultas se salvan de Instagram */
function browserKind(ua: string): string {
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook';
  if (/TikTok|musical_ly|Bytedance/i.test(ua)) return 'tiktok';
  return 'navegador';
}

/**
 * Guarda una consulta (oferta, talle buscado, duda o encargo) con el teléfono
 * de la persona, para que el dueño la vea en /admin/consultas aunque el
 * mensaje de WhatsApp nunca salga.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (leadLimiter.isBlocked(ip)) {
    return NextResponse.json({ ok: false, error: 'Demasiadas consultas seguidas. Probá en unos minutos.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const checked = validateLead(body);
  if (!checked.ok) return NextResponse.json({ ok: false, error: checked.error }, { status: 400 });
  // Cada consulta cuenta: frena a quien quiera llenar el panel de basura
  leadLimiter.recordFailedAttempt(ip);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: 'No disponible' }, { status: 503 });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.from('leads').insert({
    ...checked.lead,
    details: { browser: browserKind(req.headers.get('user-agent') || '') },
  });

  if (error) {
    // Falta correr supabase/migration-consultas.sql: el navegador vuelve al WhatsApp de siempre
    console.error('[LEADS] No se pudo guardar la consulta:', error.message);
    return NextResponse.json({ ok: false, error: 'No disponible' }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
