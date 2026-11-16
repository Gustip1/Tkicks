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
  const details: Record<string, unknown> = { browser: browserKind(req.headers.get('user-agent') || '') };
  if (checked.ref) details.ref = checked.ref;

  // Un checkout en curso se guarda una sola vez: si la persona vuelve atrás y
  // corrige sus datos, se actualiza la misma fila
  if (checked.ref) {
    const { data: existing } = await supabase.from('leads').select('id').eq('details->>ref', checked.ref).limit(1).maybeSingle();
    if (existing) {
      await supabase.from('leads').update({ ...checked.lead, kind: undefined }).eq('id', existing.id);
      return NextResponse.json({ ok: true });
    }
  }

  let { error } = await supabase.from('leads').insert({ ...checked.lead, details });
  // Base con la primera versión de la tabla (sin el tipo "checkout"): se guarda como consulta
  if (error?.code === '23514' && checked.lead.kind === 'checkout') {
    ({ error } = await supabase.from('leads').insert({ ...checked.lead, kind: 'question', details }));
  }

  if (error) {
    // Falta correr supabase/migration-consultas.sql: el navegador vuelve al WhatsApp de siempre
    console.error('[LEADS] No se pudo guardar la consulta:', error.message);
    return NextResponse.json({ ok: false, error: 'No disponible' }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * La compra se terminó: se borra la "compra sin terminar" de ese checkout, si
 * el dueño todavía no la respondió. La referencia es un identificador al azar
 * que solo conoce el navegador que la creó.
 */
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ref = String(body?.ref ?? '');
  if (!/^[A-Za-z0-9-]{8,64}$/.test(ref)) return NextResponse.json({ ok: false }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false }, { status: 503 });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  await supabase.from('leads').delete().eq('details->>ref', ref).eq('status', 'new');
  return NextResponse.json({ ok: true });
}
