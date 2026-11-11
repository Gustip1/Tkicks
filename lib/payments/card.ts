import { getCardPriceMultiplier } from '@/lib/promo';

/**
 * Pago con tarjeta de crédito (Payway). Reglas del dueño (nov 2026):
 * - 1 pago: sin recargo.
 * - 3 cuotas (Cuota MiPyME 3): 10% de recargo. Con la promo "cuotas sin
 *   interés" activa en /admin/ajustes, 3 cuotas sin recargo.
 * - 6 cuotas (Cuota MiPyME 6): 20% de recargo. La promo es de 3 cuotas: no lo cambia.
 *
 * Lo usan el checkout (para mostrar) y el servidor (para cobrar): el monto en
 * pesos sale siempre de estas funciones, así lo que se ve es lo que se cobra.
 */

export const CARD_INSTALLMENTS = [1, 3, 6] as const;
export type CardInstallments = (typeof CARD_INSTALLMENTS)[number];

export function isCardInstallments(n: unknown): n is CardInstallments {
  return n === 1 || n === 3 || n === 6;
}

/** Recargo de 6 cuotas */
export const SIX_INSTALLMENTS_SURCHARGE = 0.2;

/** Multiplicador sobre el precio: 1 pago sin recargo; 3 cuotas 10% (0% con promo); 6 cuotas 20% */
export function cardMultiplier(installments: CardInstallments, promoOn: boolean): number {
  if (installments === 3) return getCardPriceMultiplier(promoOn);
  if (installments === 6) return 1 + SIX_INSTALLMENTS_SURCHARGE;
  return 1;
}

/** "10%", o null sin recargo */
export function surchargeLabel(installments: CardInstallments, promoOn: boolean): string | null {
  const pct = Math.round((cardMultiplier(installments, promoOn) - 1) * 100);
  return pct > 0 ? `${pct}%` : null;
}

export function cardTotalUsd(subtotalUsd: number, installments: CardInstallments, promoOn: boolean): number {
  return subtotalUsd * cardMultiplier(installments, promoOn);
}

/** Lo que se cobra en pesos, redondeado al peso */
export function cardTotalArs(
  subtotalUsd: number,
  installments: CardInstallments,
  promoOn: boolean,
  dollarRate: number
): number {
  return Math.round(cardTotalUsd(subtotalUsd, installments, promoOn) * dollarRate);
}

/**
 * El dólar oficial del navegador (cacheado unos minutos) y el del servidor
 * (recién pedido) pueden diferir apenas. Hasta este margen se cobra lo que el
 * cliente vio; más allá, se le muestra el monto nuevo antes de cobrar.
 */
export const PRICE_TOLERANCE = 0.005;

export function sameCharge(shownArs: number, serverArs: number): boolean {
  return Math.abs(shownArs - serverArs) <= serverArs * PRICE_TOLERANCE;
}

export type CardBrand = 'visa' | 'mastercard' | 'amex';

export const CARD_BRAND_LABEL: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
};

/** La marca sale de los primeros dígitos de la tarjeta */
export function cardBrandOf(number: string): CardBrand | null {
  const d = number.replace(/\D/g, '');
  if (/^4/.test(d)) return 'visa';
  if (/^3[47]/.test(d)) return 'amex';
  if (/^5[1-5]/.test(d)) return 'mastercard';
  if (d.length >= 4) {
    const p = Number(d.slice(0, 4));
    if (p >= 2221 && p <= 2720) return 'mastercard';
  }
  return null;
}

/** Largo del número y del código de seguridad según la marca */
export function cardLengths(brand: CardBrand | null): { number: number; cvv: number } {
  return brand === 'amex' ? { number: 15, cvv: 4 } : { number: 16, cvv: 3 };
}

/** "4507990000004905" → "4507 9900 0000 4905"; Amex en 4-6-5 */
export function formatCardNumber(value: string): string {
  const d = value.replace(/\D/g, '');
  const brand = cardBrandOf(d);
  const max = cardLengths(brand).number;
  const digits = d.slice(0, max);
  if (brand === 'amex') {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(' ');
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** Verificación de Luhn: atrapa un dígito mal tipeado antes de ir al banco */
export function luhnValid(number: string): boolean {
  const d = number.replace(/\D/g, '');
  if (d.length < 13) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

/** "12/30" → { month: '12', year: '30' }; null si no es una fecha futura válida */
export function parseExpiry(value: string, now = new Date()): { month: string; year: string } | null {
  const m = value.replace(/\s/g, '').match(/^(\d{2})\/?(\d{2})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return null;
  // Vale hasta el último día del mes de vencimiento
  const end = new Date(year, month, 1);
  if (end <= now) return null;
  return { month: m[1], year: m[2] };
}

/** Dirección de facturación (la pide el control de fraude de Payway) */
export interface BillingAddress {
  street: string;
  postalCode: string;
  city: string;
  /** Nombre de la provincia, como en PROVINCES */
  province: string;
}

/** Provincias con su código ISO 3166-2:AR, el que usa Cybersource */
export const PROVINCES: { name: string; code: string }[] = [
  { name: 'Buenos Aires', code: 'B' },
  { name: 'Ciudad de Buenos Aires', code: 'C' },
  { name: 'Catamarca', code: 'K' },
  { name: 'Chaco', code: 'H' },
  { name: 'Chubut', code: 'U' },
  { name: 'Córdoba', code: 'X' },
  { name: 'Corrientes', code: 'W' },
  { name: 'Entre Ríos', code: 'E' },
  { name: 'Formosa', code: 'P' },
  { name: 'Jujuy', code: 'Y' },
  { name: 'La Pampa', code: 'L' },
  { name: 'La Rioja', code: 'F' },
  { name: 'Mendoza', code: 'M' },
  { name: 'Misiones', code: 'N' },
  { name: 'Neuquén', code: 'Q' },
  { name: 'Río Negro', code: 'R' },
  { name: 'Salta', code: 'A' },
  { name: 'San Juan', code: 'J' },
  { name: 'San Luis', code: 'D' },
  { name: 'Santa Cruz', code: 'Z' },
  { name: 'Santa Fe', code: 'S' },
  { name: 'Santiago del Estero', code: 'G' },
  { name: 'Tierra del Fuego', code: 'V' },
  { name: 'Tucumán', code: 'T' },
];

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * La provincia escrita a mano (datos viejos del checkout) → nombre de la lista.
 * null si no se reconoce.
 */
export function canonicalProvince(value: string): string | null {
  const v = fold(value).replace(/^provincia de /, '');
  if (!v) return null;
  if (/^(caba|capital|capital federal|ciudad autonoma de buenos aires|ciudad de buenos aires|c a b a)$/.test(v)) {
    return 'Ciudad de Buenos Aires';
  }
  if (/^(bs as|pba|buenos aires|pcia de buenos aires)$/.test(v)) return 'Buenos Aires';
  if (/tierra del fuego/.test(v)) return 'Tierra del Fuego';
  return PROVINCES.find((p) => fold(p.name) === v)?.name ?? null;
}

export function provinceCode(value: string): string | null {
  const name = canonicalProvince(value);
  return name ? PROVINCES.find((p) => p.name === name)!.code : null;
}

/** Código postal argentino: 4 números o CPA (J5400ABC) */
export function validPostalCode(value: string): boolean {
  return /^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/.test(value.replace(/\s/g, ''));
}

/** Teléfono como lo pide Cybersource: solo números, con el 54 adelante */
export function phoneWithCountry(value: string): string {
  let d = value.replace(/\D/g, '').replace(/^00/, '');
  if (!d) return '';
  if (!d.startsWith('54')) d = `54${d.replace(/^0/, '')}`;
  return d;
}
