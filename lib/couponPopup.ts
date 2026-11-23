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

export interface CouponPopupSettings {
  enabled: boolean;
  /** Vacío: se usa el descuento del cupón ("10% de descuento") */
  title: string;
  text: string;
  /** Segundos en la web antes de aparecer */
  delaySeconds: number;
}

export const DEFAULT_COUPON_POPUP: CouponPopupSettings = {
  enabled: false,
  title: '',
  text: 'Dejanos tu WhatsApp y te mandamos el cupón.',
  delaySeconds: 15,
};

export function parseCouponPopup(value: unknown): CouponPopupSettings {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<CouponPopupSettings>;
  const delay = Number(v.delaySeconds);
  return {
    enabled: v.enabled === true,
    title: typeof v.title === 'string' ? v.title.trim().slice(0, 80) : '',
    text: typeof v.text === 'string' && v.text.trim() ? v.text.trim().slice(0, 200) : DEFAULT_COUPON_POPUP.text,
    delaySeconds: Number.isFinite(delay) ? Math.min(120, Math.max(3, Math.round(delay))) : DEFAULT_COUPON_POPUP.delaySeconds,
  };
}

/** Lo que el popup muestra antes de que dejen el número (nunca el código) */
export interface CouponPopupPublic {
  enabled: boolean;
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
}

export const SUBSCRIBER_STATUS_LABELS: Record<SubscriberStatus, string> = {
  pending: 'Pendiente',
  sent: 'Enviado por WhatsApp',
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
