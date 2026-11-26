import type { DiscountCode } from '@/types/db';
import { couponSummary } from '@/lib/coupons';

/**
 * Popup de cupón: el visitante deja su WhatsApp y recibe un cupón. Lo que se
 * comparte entre el popup, la ruta que lo guarda y el panel.
 *
 * En `settings` (que se lee con la clave pública) va solo lo que se puede ver:
 * si está prendido y los textos. Qué cupón entrega está en la tabla de cupones
 * (`discount_codes.popup`), que es privada.
 */

export const COUPON_POPUP_KEY = 'coupon_popup';

/**
 * coupon: entrega al instante el cupón elegido, a cambio del WhatsApp.
 * list: arma una lista (email y WhatsApp) y los cupones los manda el dueño a
 *       mano, a cada persona el que quiera (Black Friday 2026: 5, 10 o 15 USD).
 */
export type CouponPopupMode = 'coupon' | 'list';

export interface CouponPopupSettings {
  enabled: boolean;
  mode: CouponPopupMode;
  /** Vacío: se usa el descuento del cupón ("10% de descuento") */
  title: string;
  text: string;
  /** Segundos en la web antes de aparecer */
  delaySeconds: number;
}

export const DEFAULT_COUPON_POPUP: CouponPopupSettings = {
  enabled: false,
  mode: 'coupon',
  title: '',
  text: 'Dejanos tu WhatsApp y te mandamos el cupón.',
  delaySeconds: 4,
};

/** La espera por defecto de la primera versión: resultó larga (el dueño lo notó) */
const OLD_DEFAULT_DELAY = 15;

/** Textos sugeridos al pasar a modo lista (el dueño los puede cambiar) */
export const LIST_POPUP_TEXTS = {
  title: 'Black Friday en Tkicks',
  text: 'Hay descuentos de 5, 10 y 15 USD. Dejanos tu email y tu WhatsApp y te mandamos el tuyo.',
};

/** Título del modo lista si el dueño lo dejó vacío */
export const LIST_POPUP_FALLBACK_TITLE = 'Sumate a la lista';

export const validEmail = (raw: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(raw || '').trim()) && String(raw).trim().length <= 120;

export function parseCouponPopup(value: unknown): CouponPopupSettings {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<CouponPopupSettings>;
  const delay = Number(v.delaySeconds);
  return {
    enabled: v.enabled === true,
    mode: v.mode === 'list' ? 'list' : 'coupon',
    title: typeof v.title === 'string' ? v.title.trim().slice(0, 80) : '',
    text: typeof v.text === 'string' && v.text.trim() ? v.text.trim().slice(0, 200) : DEFAULT_COUPON_POPUP.text,
    // Quien guardó la espera vieja por defecto (15 s) pasa a la nueva (4 s)
    delaySeconds:
      Number.isFinite(delay) && Math.round(delay) !== OLD_DEFAULT_DELAY ? Math.min(60, Math.max(2, Math.round(delay))) : DEFAULT_COUPON_POPUP.delaySeconds,
  };
}

/** Lo que el popup muestra antes de que dejen el número (nunca el código) */
/**
 * Los descuentos que el popup muestra en grande. En modo lista salen del
 * texto que escribió el dueño ("Hay descuentos de 5, 10 y 15 USD. Dejanos…"
 * → US$ 5, US$ 10, US$ 15) y esa primera frase no se repite debajo.
 */
export function extractHighlights(text: string): { highlights: string[]; rest: string } {
  const clean = String(text || '').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const first = sentences[0] ?? '';
  const usd = /US\$|USD|u\$s|d[oó]lares/i.test(first);
  const pct = /%|por ciento/i.test(first);
  const numbers = (first.match(/\d+(?:[.,]\d+)?/g) ?? []).slice(0, 3);
  if (numbers.length === 0 || (!usd && !pct)) return { highlights: [], rest: clean };
  const highlights = numbers.map((n) => (usd ? `US$ ${n}` : `${n}%`));
  // Si era la única frase se deja: el popup no puede quedar sin explicación
  const rest = sentences.length > 1 ? sentences.slice(1).join(' ') : clean;
  return { highlights, rest };
}

export interface CouponPopupPublic {
  enabled: boolean;
  mode: CouponPopupMode;
  /** "US$ 5", "US$ 10" o "10%": van en grande arriba */
  highlights: string[];
  title: string;
  text: string;
  delaySeconds: number;
  conditions: string[];
}

export type SubscriberStatus = 'pending' | 'sent' | 'failed' | 'shown';

export interface Subscriber {
  id: string;
  phone: string;
  wa_number: string;
  coupon_code: string | null;
  source: string;
  status: SubscriberStatus;
  wa_error: string | null;
  created_at: string;
  sent_at: string | null;
  /** En modo lista acá va el email */
  details?: { email?: string } | null;
}

export const SUBSCRIBER_STATUS_LABELS: Record<SubscriberStatus, string> = {
  pending: 'Falta mandarle el cupón',
  sent: 'Enviado',
  failed: 'Falló el envío · lo vio en pantalla',
  shown: 'Lo vio en pantalla',
};

/** Las variables de una plantilla de WhatsApp no aceptan saltos de línea ni espacios seguidos */
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Qué da el cupón, en una frase: "10% de descuento, hasta US$ 30. En compras
 * desde US$ 100. Hasta el 30/11". Es la variable {{2}} de la plantilla.
 */
export function couponDescription(coupon: Partial<DiscountCode>, brandNames: Record<string, string> = {}, now: Date = new Date()): string {
  const { headline, conditions } = couponSummary(coupon, brandNames, now);
  // "Hasta 50 usos" es un dato interno: al cliente no le dice nada
  const visible = conditions.filter((c) => !/usos?$/.test(c));
  return oneLine([headline, ...visible].join('. '));
}

/** Variables de la plantilla, en orden: {{1}} el código, {{2}} qué da */
export function couponTemplateParams(coupon: Partial<DiscountCode>, brandNames: Record<string, string> = {}, now: Date = new Date()): string[] {
  return [oneLine(String(coupon.code ?? '')), couponDescription(coupon, brandNames, now)];
}

/** El mismo mensaje, para mandarlo a mano desde el panel */
export function couponMessage(code: string, description: string): string {
  return `Hola, gracias por sumarte a Tkicks. Tu cupón es ${code}: ${description}. Lo cargás en el checkout de www.tkicks.com.ar`;
}

/** El texto que hay que cargar como plantilla en Meta (mismo mensaje, con variables) */
export const COUPON_TEMPLATE_TEXT = couponMessage('{{1}}', '{{2}}');
