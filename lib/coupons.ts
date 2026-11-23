import type { DiscountCode } from '@/types/db';

/**
 * Reglas de los cupones. Un solo lugar decide si un cupón vale y cuánto
 * descuenta: lo usan la vista previa del checkout (/api/coupons/validate), el
 * alta del pedido (lib/orders/create.ts) y el panel, que con lo mismo arma la
 * frase que resume cada cupón. Así lo que el cliente ve es lo que se cobra.
 *
 * Todas las condiciones son opcionales: un cupón sin ninguna se comporta como
 * los de antes (porcentaje o monto fijo sobre todo el carrito).
 */

export type CouponPaymentScope = 'transfer_cash' | 'card';

export interface CouponItem {
  price: number;
  quantity: number;
  category?: string | null;
  /** slug de la marca */
  brand?: string | null;
  onSale?: boolean;
}

export interface CouponContext {
  items: CouponItem[];
  /** Medio de pago elegido; si todavía no eligió, esa condición no se evalúa */
  paymentMethod?: string | null;
  now?: Date;
}

export type CouponResult =
  | {
      ok: true;
      /** En dólares, redondeado a centavos */
      discount: number;
      /** Suma de los productos a los que el cupón aplica */
      eligibleSubtotal: number;
      /** true si algún producto del carrito quedó afuera del descuento */
      partial: boolean;
    }
  | { ok: false; reason: string };

export const CATEGORY_LABELS: Record<string, string> = { sneakers: 'Sneakers', streetwear: 'Streetwear' };

export const PAYMENT_SCOPE_LABELS: Record<CouponPaymentScope, string> = {
  transfer_cash: 'transferencia o efectivo',
  card: 'tarjeta',
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "US$ 100" o "US$ 99.50" */
export const usd = (n: number) => `US$ ${Number.isInteger(n) ? n : n.toFixed(2)}`;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function paymentGroup(method: string | null | undefined): CouponPaymentScope | null {
  if (method === 'cash' || method === 'crypto_transfer') return 'transfer_cash';
  if (method === 'card' || method === 'installments_3') return 'card';
  return null;
}

const brandList = (c: Partial<DiscountCode>) => (Array.isArray(c.applies_brands) ? c.applies_brands.filter(Boolean) : []);

/** ¿El cupón alcanza a este producto? */
function eligible(c: Partial<DiscountCode>, item: CouponItem): boolean {
  if (c.applies_category && item.category !== c.applies_category) return false;
  const brands = brandList(c);
  if (brands.length > 0 && !brands.includes(item.brand ?? '')) return false;
  if (c.exclude_sale && item.onSale) return false;
  return true;
}

export type CouponStatus = 'active' | 'paused' | 'scheduled' | 'expired' | 'exhausted';

export function couponStatus(c: Partial<DiscountCode>, now: Date = new Date()): CouponStatus {
  if (c.active === false) return 'paused';
  if (c.ends_at && new Date(c.ends_at) < now) return 'expired';
  if (c.max_uses != null && (c.used_count ?? 0) >= c.max_uses) return 'exhausted';
  if (c.starts_at && new Date(c.starts_at) > now) return 'scheduled';
  return 'active';
}

const STATUS_REASON: Record<Exclude<CouponStatus, 'active'>, string> = {
  paused: 'Cupón inactivo',
  scheduled: 'Cupón todavía no está vigente',
  expired: 'Cupón vencido',
  exhausted: 'Cupón agotado',
};

/** A qué productos aplica, en palabras: "Sneakers de Nike, Supreme" */
function scopeText(c: Partial<DiscountCode>, brandNames: Record<string, string> = {}): string | null {
  const brands = brandList(c).map((slug) => brandNames[slug] ?? slug);
  const cat = c.applies_category ? CATEGORY_LABELS[c.applies_category] ?? c.applies_category : null;
  if (cat && brands.length) return `${cat} de ${brands.join(', ')}`;
  if (cat) return cat;
  if (brands.length) return brands.join(', ');
  return null;
}

export function evaluateCoupon(c: Partial<DiscountCode>, ctx: CouponContext, brandNames: Record<string, string> = {}): CouponResult {
  const status = couponStatus(c, ctx.now);
  if (status !== 'active') return { ok: false, reason: STATUS_REASON[status] };

  const scope = c.payment_scope as CouponPaymentScope | null | undefined;
  const group = paymentGroup(ctx.paymentMethod);
  if (scope && group && group !== scope) {
    return { ok: false, reason: `Este cupón vale solo pagando con ${PAYMENT_SCOPE_LABELS[scope]}` };
  }

  const lineTotal = (it: CouponItem) => it.price * it.quantity;
  const applies = ctx.items.filter((it) => eligible(c, it));
  const eligibleSubtotal = round2(applies.reduce((acc, it) => acc + lineTotal(it), 0));

  if (applies.length === 0 || eligibleSubtotal <= 0) {
    const scopeLabel = scopeText(c, brandNames);
    if (scopeLabel) return { ok: false, reason: `Este cupón vale solo para ${scopeLabel}` };
    if (c.exclude_sale) return { ok: false, reason: 'Este cupón no aplica a productos en oferta' };
    return { ok: false, reason: 'Este cupón no aplica a los productos de tu carrito' };
  }

  const min = num(c.min_subtotal);
  if (min !== null && eligibleSubtotal < min) {
    const scopeLabel = scopeText(c, brandNames);
    return {
      ok: false,
      reason: `Este cupón vale en compras desde ${usd(min)}${scopeLabel ? ` de ${scopeLabel}` : ''}. Te faltan ${usd(round2(min - eligibleSubtotal))}`,
    };
  }

  const value = Number(c.value) || 0;
  let discount = c.type === 'percent' ? (eligibleSubtotal * value) / 100 : value;
  const cap = num(c.max_discount);
  if (c.type === 'percent' && cap !== null) discount = Math.min(discount, cap);
  discount = round2(Math.min(discount, eligibleSubtotal));

  return { ok: true, discount, eligibleSubtotal, partial: applies.length < ctx.items.length };
}

const TZ = 'America/Argentina/Buenos_Aires';

/** "30/11" (o "30/11/2027" si no es de este año), en hora argentina */
export function shortDateAR(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const year = (x: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric' }).format(x);
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    day: 'numeric',
    month: 'numeric',
    ...(year(d) !== year(now) ? { year: 'numeric' } : {}),
  }).format(d);
}

/** Fecha de un <input type="date"> → comienzo o fin de ese día en Argentina (UTC-3 todo el año) */
export const dayStartAR = (date: string) => new Date(`${date}T00:00:00-03:00`).toISOString();
export const dayEndAR = (date: string) => new Date(`${date}T23:59:59-03:00`).toISOString();

/** Lo inverso: el día argentino de una fecha guardada, como "2026-11-30" */
export const toDateInputAR = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)) : '';

/**
 * El cupón en palabras. `headline` es el descuento ("10% de descuento, hasta
 * US$ 30") y `conditions` las condiciones, cada una en una frase corta.
 */
export function couponSummary(
  c: Partial<DiscountCode>,
  brandNames: Record<string, string> = {},
  now: Date = new Date()
): { headline: string; conditions: string[] } {
  const value = Number(c.value) || 0;
  const cap = num(c.max_discount);
  const headline =
    c.type === 'percent'
      ? `${value}% de descuento${cap !== null ? `, hasta ${usd(cap)}` : ''}`
      : `${usd(value)} de descuento`;

  const conditions: string[] = [];
  const min = num(c.min_subtotal);
  if (min !== null) conditions.push(`En compras desde ${usd(min)}`);
  const scopeLabel = scopeText(c, brandNames);
  if (scopeLabel) conditions.push(`Solo ${scopeLabel}`);
  if (c.exclude_sale) conditions.push('No aplica a productos en oferta');
  if (c.payment_scope) conditions.push(`Pagando con ${PAYMENT_SCOPE_LABELS[c.payment_scope as CouponPaymentScope] ?? c.payment_scope}`);
  if (c.first_purchase_only) conditions.push('Solo en la primera compra');
  if (c.once_per_customer) conditions.push('Un uso por cliente');
  if (c.max_uses != null) conditions.push(c.max_uses === 1 ? 'Un solo uso' : `Hasta ${c.max_uses} usos`);
  if (c.starts_at && new Date(c.starts_at) > now) conditions.push(`Desde el ${shortDateAR(c.starts_at, now)}`);
  if (c.ends_at) conditions.push(`Hasta el ${shortDateAR(c.ends_at, now)}`);

  return { headline, conditions };
}
