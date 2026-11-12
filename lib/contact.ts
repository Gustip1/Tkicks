"use client";
import type { LeadInput } from '@/lib/leads';

/** WhatsApp del negocio */
export const WA_NUMBER = '5492644802994';

export const waLink = (text?: string) =>
  `https://api.whatsapp.com/send?phone=${WA_NUMBER}${text ? `&text=${encodeURIComponent(text)}` : ''}`;

const PHONE_KEY = 'tk-contact-phone';
const INTENT_KEY = 'tk-wa-intent';
const RESCUED_KEY = 'tk-wa-rescued';
export const INTENT_EVENT = 'tk-wa-intent';

/** El número que dejó la última vez, para no pedirlo de nuevo */
export function rememberedPhone(): string {
  try {
    return localStorage.getItem(PHONE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Guarda la consulta en la web. Devuelve false si no se pudo (sin conexión, o
 * la tabla todavía no existe): quien llama ofrece WhatsApp como salida.
 */
export async function saveLead(input: LeadInput): Promise<{ ok: boolean; error?: string }> {
  try {
    localStorage.setItem(PHONE_KEY, input.phone);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, page_path: input.page_path ?? window.location.pathname }),
      keepalive: true,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data?.ok === true, error: res.status === 400 || res.status === 429 ? data?.error : undefined };
  } catch {
    return { ok: false };
  }
}

export interface WhatsAppIntent {
  at: number;
  source: string;
  productSlug?: string | null;
  productTitle?: string | null;
  size?: string | null;
}

/**
 * Se llama al tocar un link de WhatsApp. Si la persona vuelve a la web (o
 * WhatsApp nunca se abrió), ContactRescue le ofrece dejar su número.
 */
export function markWhatsAppIntent(intent: Omit<WhatsAppIntent, 'at'>) {
  try {
    if (sessionStorage.getItem(RESCUED_KEY)) return;
    sessionStorage.setItem(INTENT_KEY, JSON.stringify({ ...intent, at: Date.now() }));
    window.dispatchEvent(new Event(INTENT_EVENT));
  } catch {
    /* sin almacenamiento: el link de WhatsApp funciona igual */
  }
}

export function readWhatsAppIntent(): WhatsAppIntent | null {
  try {
    if (sessionStorage.getItem(RESCUED_KEY)) return null;
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const intent = JSON.parse(raw) as WhatsAppIntent;
    // Pasado un rato ya no tiene sentido preguntar
    if (!intent?.at || Date.now() - intent.at > 20 * 60 * 1000) {
      sessionStorage.removeItem(INTENT_KEY);
      return null;
    }
    return intent;
  } catch {
    return null;
  }
}

/** Una sola vez por visita: después de preguntar no se insiste */
export function closeWhatsAppIntent() {
  try {
    sessionStorage.removeItem(INTENT_KEY);
    sessionStorage.setItem(RESCUED_KEY, '1');
  } catch {
    /* nada */
  }
}
