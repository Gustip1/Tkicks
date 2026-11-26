import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { leadLimiter } from '@/lib/security/rate-limiter';
import { getClientIp } from '@/lib/security/get-client-ip';
import { toWhatsAppNumber, validPhone } from '@/lib/leads';
import { couponStatus, couponSummary } from '@/lib/coupons';
import { COUPON_POPUP_KEY, couponTemplateParams, CouponPopupPublic, extractHighlights, LIST_POPUP_FALLBACK_TITLE, parseCouponPopup, validEmail } from '@/lib/couponPopup';
import { sendTemplate, whatsappConfig } from '@/lib/whatsapp';
import type { DiscountCode } from '@/types/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function service(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function readSettings(supabase: SupabaseClient) {
  const { data } = await supabase.from('settings').select('value').eq('key', COUPON_POPUP_KEY).maybeSingle();
  return parseCouponPopup(data?.value);
}

/** El cupón que entrega el popup, si hay uno elegido y vigente */
async function popupCoupon(supabase: SupabaseClient) {
  // Falla si falta la columna `popup` (migración sin correr): se toma como que no hay
  const { data: coupons, error } = await supabase.from('discount_codes').select('*').eq('popup', true).limit(1);
  const coupon = (error ? null : (coupons?.[0] as DiscountCode | undefined)) ?? null;
  if (!coupon || couponStatus(coupon) !== 'active') return null;

  const slugs = Array.isArray(coupon.applies_brands) ? coupon.applies_brands.filter(Boolean) : [];
  let brandNames: Record<string, string> = {};
  if (slugs.length > 0) {
    const { data } = await supabase.from('brands').select('name, slug').in('slug', slugs);
    brandNames = Object.fromEntries((data ?? []).map((b: any) => [b.slug, b.name]));
  }
  const summary = couponSummary(coupon, brandNames);
  // "Hasta 50 usos" es un dato interno: al cliente no le dice nada
  const conditions = summary.conditions.filter((c) => !/usos?$/.test(c));
  return { coupon, brandNames, headline: summary.headline, conditions };
}

const OFF: CouponPopupPublic = { enabled: false, mode: 'coupon', highlights: [], title: '', text: '', delaySeconds: 0, conditions: [] };

/**
 * Lo que el popup necesita para mostrarse. Nunca incluye el código: eso se
 * entrega recién cuando dejan el número (o lo manda el dueño, en modo lista).
 */
export async function GET() {
  const supabase = service();
  let body: CouponPopupPublic = OFF;
  if (supabase) {
    const settings = await readSettings(supabase);
    if (settings.enabled && settings.mode === 'list') {
      const { highlights, rest } = extractHighlights(settings.text);
      body = { enabled: true, mode: 'list', highlights, title: settings.title || LIST_POPUP_FALLBACK_TITLE, text: rest, delaySeconds: settings.delaySeconds, conditions: [] };
    } else if (settings.enabled) {
      const popup = await popupCoupon(supabase);
      if (popup) {
        const c = popup.coupon;
        body = {
          enabled: true,
          mode: 'coupon',
          highlights: [c.type === 'percent' ? `${Number(c.value)}%` : `US$ ${Number(c.value)}`],
          title: settings.title || popup.headline,
          text: settings.text,
          delaySeconds: settings.delaySeconds,
          conditions: popup.conditions,
        };
      }
    }
  }
  // Un minuto en la red de Vercel: no se consulta la base por cada visita
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}

function browserKind(ua: string): string {
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook';
  if (/TikTok|musical_ly|Bytedance/i.test(ua)) return 'tiktok';
  return 'navegador';
}

/**
 * Guarda el número y entrega el cupón. Si la API de WhatsApp está conectada
 * (lib/whatsapp.ts) el cupón sale por WhatsApp; si no, o si el envío falla,
 * se devuelve el código para mostrarlo en pantalla: nadie se queda sin su
 * cupón después de dejar el número.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (leadLimiter.isBlocked(ip)) {
    return NextResponse.json({ ok: false, error: 'Demasiados intentos. Probá en unos minutos.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const phone = String(body?.phone ?? '').trim().slice(0, 30);
  if (!validPhone(phone)) {
    return NextResponse.json({ ok: false, error: 'Escribí tu número con característica, por ejemplo 264 480 2994' }, { status: 400 });
  }
  leadLimiter.recordFailedAttempt(ip);

  const supabase = service();
  if (!supabase) return NextResponse.json({ ok: false, error: 'No disponible' }, { status: 503 });

  const settings = await readSettings(supabase);
  if (!settings.enabled) {
    return NextResponse.json({ ok: false, error: 'Esta promo ya no está disponible.' }, { status: 409 });
  }
  const waNumber = toWhatsAppNumber(phone);
  const browser = browserKind(req.headers.get('user-agent') || '');

  // ── Modo lista: queda anotado con email y WhatsApp; el cupón lo manda el dueño ──
  if (settings.mode === 'list') {
    const email = String(body?.email ?? '').trim().toLowerCase();
    if (!validEmail(email)) {
      return NextResponse.json({ ok: false, error: 'Revisá el email.', field: 'email' }, { status: 400 });
    }
    const { data: existing } = await supabase.from('subscribers').select('id, status').eq('wa_number', waNumber).maybeSingle();
    const row = {
      phone,
      wa_number: waNumber,
      source: 'lista',
      // Si ya se le mandó el cupón, anotarse de nuevo no lo vuelve a "pendiente"
      status: existing?.status === 'sent' ? 'sent' : 'pending',
      unsubscribed_at: null,
      details: { browser, email },
    };
    const { error: saveErr } = existing
      ? await supabase.from('subscribers').update(row).eq('id', existing.id)
      : await supabase.from('subscribers').insert(row);
    if (saveErr) {
      console.error('[SUBSCRIBERS] No se pudo guardar en la lista:', saveErr.message);
      return NextResponse.json({ ok: false, error: 'No pudimos guardar tus datos. Probá de nuevo.' }, { status: 503 });
    }
    return NextResponse.json({ ok: true, delivery: 'later' });
  }

  const popup = await popupCoupon(supabase);
  if (!popup) {
    return NextResponse.json({ ok: false, error: 'Este cupón ya no está disponible.' }, { status: 409 });
  }
  const { coupon, brandNames, headline, conditions } = popup;
  const onScreen = { ok: true, delivery: 'screen' as const, code: coupon.code, headline, conditions };

  const { data: existing } = await supabase.from('subscribers').select('id, status, coupon_code').eq('wa_number', waNumber).maybeSingle();

  // Ya se le mandó este mismo cupón: no se repite el mensaje (cada envío se paga)
  if (existing?.status === 'sent' && existing.coupon_code === coupon.code) {
    return NextResponse.json({ ok: true, delivery: 'whatsapp', already: true });
  }

  const row = {
    phone,
    wa_number: waNumber,
    coupon_code: coupon.code,
    source: 'popup',
    status: 'pending',
    wa_error: null,
    unsubscribed_at: null,
    details: { browser },
  };
  const { data: saved, error: saveErr } = existing
    ? await supabase.from('subscribers').update(row).eq('id', existing.id).select('id').single()
    : await supabase.from('subscribers').insert(row).select('id').single();

  if (saveErr || !saved) {
    console.error('[SUBSCRIBERS] No se pudo guardar el número:', saveErr?.message);
    return NextResponse.json({ ok: false, error: 'No pudimos guardar tu número. Probá de nuevo.' }, { status: 503 });
  }

  const cfg = whatsappConfig();
  if (!cfg) {
    await supabase.from('subscribers').update({ status: 'shown' }).eq('id', saved.id);
    return NextResponse.json(onScreen);
  }

  const sent = await sendTemplate(cfg, waNumber, couponTemplateParams(coupon, brandNames));
  if (!sent.ok) {
    console.error('[SUBSCRIBERS] WhatsApp no aceptó el mensaje:', sent.error);
    await supabase.from('subscribers').update({ status: 'failed', wa_error: sent.error }).eq('id', saved.id);
    return NextResponse.json(onScreen);
  }

  await supabase.from('subscribers').update({ status: 'sent', wa_message_id: sent.id, sent_at: new Date().toISOString() }).eq('id', saved.id);
  return NextResponse.json({ ok: true, delivery: 'whatsapp' });
}
