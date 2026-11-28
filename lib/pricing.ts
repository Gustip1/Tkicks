/**
 * Rentabilidad y precio de mercado de un producto, para el panel.
 *
 * Todo en dólares, como se cargan los precios. Se calcula sobre el precio al
 * que realmente se vende: el de rebaja si hay uno válido, si no el de lista.
 */

/** Margen que se considera sano para reventa (sugerencia, no regla) */
export const TARGET_MARGIN = 0.25;

/** El precio que paga el cliente: la rebaja si es válida (mayor a 0 y menor al de lista) */
export function effectivePrice(price: number, salePrice?: number | string | null): number {
  const p = Number(price) || 0;
  const s = salePrice === '' || salePrice == null ? NaN : Number(salePrice);
  return Number.isFinite(s) && s > 0 && s < p ? s : p;
}

export type MarginLevel = 'loss' | 'low' | 'ok' | 'high';

export interface MarginAnalysis {
  price: number;
  cost: number;
  /** Ganancia por unidad, en dólares */
  profit: number;
  /** Ganancia sobre el precio de venta (0,25 = 25%) */
  margin: number;
  /** Ganancia sobre el costo (0,33 = 33%) */
  markup: number;
  level: MarginLevel;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function analyzeMargin(price: number, cost: number | null | undefined): MarginAnalysis | null {
  const p = Number(price);
  const c = Number(cost);
  if (!(p > 0) || !(c > 0)) return null;
  const profit = round2(p - c);
  const margin = profit / p;
  const level: MarginLevel = profit < 0 ? 'loss' : margin < 0.15 ? 'low' : margin < 0.3 ? 'ok' : 'high';
  return { price: p, cost: c, profit, margin, markup: profit / c, level };
}

/** Precio al que hay que vender para ganar ese margen sobre el precio de venta */
export function priceForMargin(cost: number, margin: number = TARGET_MARGIN): number {
  return Math.ceil((cost / (1 - margin)) * 100) / 100;
}

export type MarketPosition = 'cheaper' | 'aligned' | 'pricier';

export interface MarketAnalysis {
  market: number;
  /** Diferencia con el mercado: -0,1 = 10% más barato, 0,2 = 20% más caro */
  diff: number;
  position: MarketPosition;
  /** Margen que tendría vendiendo al precio de mercado (si hay costo) */
  atMarket: MarginAnalysis | null;
}

/** Hasta un 5% arriba o abajo se considera "en precio de mercado" */
const ALIGNED_BAND = 0.05;

export function analyzeMarket(price: number, market: number | null | undefined, cost?: number | null): MarketAnalysis | null {
  const p = Number(price);
  const m = Number(market);
  if (!(p > 0) || !(m > 0)) return null;
  const diff = (p - m) / m;
  const position: MarketPosition = diff < -ALIGNED_BAND ? 'cheaper' : diff > ALIGNED_BAND ? 'pricier' : 'aligned';
  return { market: m, diff, position, atMarket: analyzeMargin(m, cost) };
}

/** "25%" o "8,5%", sin decimales de más */
export function pct(fraction: number): string {
  const v = Math.abs(fraction * 100);
  const text = v >= 10 || Number.isInteger(Math.round(v * 10) / 10) ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
  return `${text}%`;
}

/** "US$ 120" o "US$ 99,50" */
export function usdText(n: number): string {
  const v = Math.round(Math.abs(n) * 100) / 100;
  const body = Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',');
  return `${n < 0 ? '-' : ''}US$ ${body}`;
}

/** Búsquedas del producto en los sitios de referencia, para mirar el mercado con un toque */
export function marketSearchLinks(query: string): { label: string; href: string }[] {
  const q = query.replace(/["“”]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return [];
  const enc = encodeURIComponent(q);
  const mlSlug = encodeURIComponent(q.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, ''));
  return [
    { label: 'StockX', href: `https://stockx.com/search?s=${enc}` },
    { label: 'GOAT', href: `https://www.goat.com/search?query=${enc}` },
    { label: 'MercadoLibre', href: `https://listado.mercadolibre.com.ar/${mlSlug}` },
    { label: 'Google', href: `https://www.google.com/search?tbm=shop&q=${enc}` },
  ];
}
