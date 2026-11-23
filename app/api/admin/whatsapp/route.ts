import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { toWhatsAppNumber, validPhone } from '@/lib/leads';
import { sendTemplate, whatsappConfig } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'No autorizado' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { ok: false as const, status: 403, error: 'Sólo admin' };
  return { ok: true as const };
}

/** ¿Está conectado el envío automático? Nunca devuelve el token. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const cfg = whatsappConfig();
  return NextResponse.json({ configured: !!cfg, template: cfg?.template ?? null, lang: cfg?.lang ?? null });
}

/** Mensaje de prueba al número que indique el admin, con la plantilla real */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const cfg = whatsappConfig();
  if (!cfg) return NextResponse.json({ ok: false, error: 'El envío automático todavía no está conectado.' }, { status: 409 });

  const body = await req.json().catch(() => null);
  const phone = String(body?.phone ?? '');
  if (!validPhone(phone)) return NextResponse.json({ ok: false, error: 'Revisá el número.' }, { status: 400 });
  const params = Array.isArray(body?.params) ? body.params.map((p: unknown) => String(p).slice(0, 300)).slice(0, 2) : [];
  if (params.length !== 2) return NextResponse.json({ ok: false, error: 'Elegí primero el cupón del popup.' }, { status: 400 });

  const sent = await sendTemplate(cfg, toWhatsAppNumber(phone), params);
  return NextResponse.json(sent, { status: sent.ok ? 200 : 502 });
}
