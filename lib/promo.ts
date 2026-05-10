/**
 * Promoción "3 cuotas sin interés".
 *
 * Activa entre PROMO_START y PROMO_END (inclusive). Fuera de ese rango
 * la tienda vuelve sola al esquema normal (10% de recargo en tarjeta).
 *
 * Para extender o mover la promo en el futuro alcanza con cambiar las
 * dos constantes de abajo.
 */

// Inicio: 11/05/2026 00:00:00 hora Argentina (UTC-3)
// Fin:    17/05/2026 23:59:59.999 hora Argentina (UTC-3)
export const PROMO_START = new Date('2026-05-11T00:00:00-03:00');
export const PROMO_END = new Date('2026-05-17T23:59:59.999-03:00');

export const PROMO_TEXT =
  'Desde el 11 hasta el 17 de mayo todos los productos van a estar en 3 cuotas sin interés al mismo precio de efectivo y transferencia.';

/** Devuelve true si "ahora" cae dentro del rango de la promo. */
export function isPromoActive(now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= PROMO_START.getTime() && t <= PROMO_END.getTime();
}

/**
 * Recargo (porcentaje) para pago en 3 cuotas con tarjeta.
 * Durante la promo: 0. Fuera de la promo: 0.10 (10%).
 */
export function getCardSurchargeRate(now?: Date): number {
  return isPromoActive(now) ? 0 : 0.1;
}

/**
 * Multiplicador a aplicar al precio base para obtener el precio en 3 cuotas.
 * Durante la promo: 1 (mismo precio). Fuera de la promo: 1.10.
 */
export function getCardPriceMultiplier(now?: Date): number {
  return 1 + getCardSurchargeRate(now);
}

/** ID único de la promo — sirve como key de localStorage para el modal. */
export const PROMO_ID = 'promo-3cuotas-2026-05-11';
