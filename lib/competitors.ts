/**
 * Comparación de precios con otros revendedores (panel → Competencia).
 *
 * Lo que no toca la red: normalizar la web que carga el dueño, armar la
 * búsqueda, leer las respuestas de Shopify y WooCommerce y medir qué tan
 * parecido es cada resultado al producto propio. La búsqueda en sí está en
 * lib/competitorFetch.ts (solo servidor).
 *
 * Formatos según la documentación oficial (nov 2026):
 * - Shopify, búsqueda predictiva: GET /search/suggest.json → resources.results.products[]
 *   con title, url, price / price_min (decimal, en la moneda de la tienda), available, image.
 * - WooCommerce Store API: GET /wp-json/wc/store/v1/products?search= → [] con name,
 *   permalink, is_in_stock, images[], prices { price (unidades mínimas), currency_code,
 *   currency_minor_unit }.
 */

export type CompetitorPlatform = 'shopify' | 'woocommerce' | 'manual';
export type Currency = 'ARS' | 'USD';

export interface CompetitorSite {
  id: string;
  name: string;
  url: string;
  platform: CompetitorPlatform;
  currency: Currency;
  active: boolean;
}

export interface CompetitorItem {
  title: string;
  url: string;
  price: number;
  currency: Currency;
  available: boolean | null;
  image: string | null;
}

export const PLATFORM_LABELS: Record<CompetitorPlatform, string> = {
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  manual: 'Sin lectura automática',
};

/** Hostnames que nunca se consultan desde el servidor (red interna) */
function privateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true; // IPv4 suelta
  if (h.includes(':') || h.startsWith('[')) return true; // IPv6
  return !h.includes('.');
}

/** "www.tienda.com.ar/productos" → "https://www.tienda.com.ar", o null si no sirve */
export function normalizeSiteUrl(raw: string): string | null {
  const text = String(raw || '').trim();
  if (!text) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (privateHost(u.hostname)) return null;
    return `https://${u.hostname.toLowerCase()}`;
  } catch {
    return null;
  }
}

/** Nombre corto para mostrar a partir de la web: "https://www.mitienda.com.ar" → "mitienda.com.ar" */
export const siteLabel = (url: string) => url.replace(/^https?:\/\//, '').replace(/^www\./, '');

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'con', 'para', 'the', 'and', 'of', 'a', 'x', 'by']);

/** Palabras que cuentan de un título, sin acentos, signos ni palabras vacías */
export function tokens(title: string): string[] {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[®™©"“”'’]/g, ' ')
    .split(/[^a-z0-9]+/)
    // Los números sueltos cuentan: "Jordan 1" y "Jordan 4" son productos distintos
    .filter((t) => (t.length > 1 || /\d/.test(t)) && !STOP.has(t));
}

/** Búsqueda que se manda a las tiendas: el título limpio, sin palabras de más */
export function searchQuery(title: string, maxWords = 6): string {
  return tokens(title).slice(0, maxWords).join(' ');
}

/** Qué parte de las palabras del producto propio aparece en el resultado (0 a 1) */
export function similarity(mine: string, theirs: string): number {
  const a = Array.from(new Set(tokens(mine)));
  if (a.length === 0) return 0;
  const b = new Set(tokens(theirs));
  return a.filter((t) => b.has(t)).length / a.length;
}

/** Parte mínima de las palabras propias que tiene que tener el otro título */
export const SIMILAR_ENOUGH = 0.75;

/**
 * Palabras que cambian el producto aunque el resto coincida: la caña (High,
 * Mid, Low), los talles de niño (GS, PS, TD…) y las versiones de mujer, que en
 * reventa tienen otro precio.
 */
const VARIANT_WORDS = new Set(['high', 'mid', 'low', 'gs', 'ps', 'td', 'kids', 'kid', 'nino', 'ninos', 'nina', 'ninas', 'infant', 'toddler', 'bebe', 'junior', 'jr', 'wmns', 'women', 'womens', 'mujer']);

/**
 * ¿Es el mismo producto? Tiene que tener casi todas las palabras del propio y
 * ninguna que lo cambie: otra caña, talle de niño o mujer, u otro número de
 * modelo (Jordan 1 contra Jordan 4).
 */
export function sameProduct(mine: string, theirs: string): boolean {
  if (similarity(mine, theirs) < SIMILAR_ENOUGH) return false;
  const a = new Set(tokens(mine));
  const b = new Set(tokens(theirs));
  for (const t of b) if (VARIANT_WORDS.has(t) && !a.has(t)) return false;
  for (const t of a) if (VARIANT_WORDS.has(t) && !b.has(t)) return false;
  const numbers = (s: Set<string>) => Array.from(s).filter((t) => /^\d+$/.test(t));
  const na = numbers(a);
  const nb = numbers(b);
  if (na.length && nb.length && !na.some((n) => b.has(n))) return false;
  return true;
}

const num = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const absolute = (origin: string, href: unknown): string => {
  const h = typeof href === 'string' ? href : '';
  try {
    const u = new URL(h, origin);
    // Sin los parámetros de seguimiento de la búsqueda (_pos, _psq…)
    return `${u.origin}${u.pathname}`;
  } catch {
    return origin;
  }
};

export function parseShopifySuggest(json: unknown, origin: string, currency: Currency): CompetitorItem[] {
  const products = (json as any)?.resources?.results?.products;
  if (!Array.isArray(products)) return [];
  return products.flatMap((p: any) => {
    const price = num(p?.price_min) ?? num(p?.price);
    if (price === null || price <= 0 || typeof p?.title !== 'string') return [];
    const image = typeof p?.image === 'string' ? p.image : typeof p?.featured_image?.url === 'string' ? p.featured_image.url : null;
    return [{ title: p.title, url: absolute(origin, p.url), price, currency, available: typeof p.available === 'boolean' ? p.available : null, image }];
  });
}

export function parseWooProducts(json: unknown, origin: string): CompetitorItem[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((p: any) => {
    const raw = num(p?.prices?.price);
    const minor = num(p?.prices?.currency_minor_unit) ?? 2;
    const code = String(p?.prices?.currency_code || 'ARS').toUpperCase();
    if (raw === null || raw <= 0 || typeof p?.name !== 'string') return [];
    if (code !== 'ARS' && code !== 'USD') return [];
    const image = Array.isArray(p?.images) && typeof p.images[0]?.src === 'string' ? p.images[0].src : null;
    return [
      {
        title: p.name.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#8217;/g, '’').trim(),
        url: absolute(origin, p.permalink),
        price: raw / 10 ** minor,
        currency: code as Currency,
        available: typeof p.is_in_stock === 'boolean' ? p.is_in_stock : null,
        image,
      },
    ];
  });
}

/** Precio en dólares, con el dólar que usa la tienda propia */
export function toUsd(price: number, currency: Currency, rate: number): number | null {
  if (currency === 'USD') return price;
  return rate > 0 ? price / rate : null;
}

export interface CompetitionSummary {
  /** Cuántos resultados parecidos se usaron */
  count: number;
  min: number;
  avg: number;
  /** Diferencia del precio propio con el promedio: -0,1 = 10% más barato */
  diffVsAvg: number;
  /** Diferencia con el más barato */
  diffVsMin: number;
  /** Cuántos venden más barato que el precio propio */
  cheaperThanMe: number;
}

/** Resumen sobre los precios (en dólares) de los resultados parecidos */
export function summarizeCompetition(myUsd: number, pricesUsd: number[]): CompetitionSummary | null {
  const list = pricesUsd.filter((p) => Number.isFinite(p) && p > 0);
  if (!(myUsd > 0) || list.length === 0) return null;
  const min = Math.min(...list);
  const avg = list.reduce((a, b) => a + b, 0) / list.length;
  return {
    count: list.length,
    min,
    avg,
    diffVsAvg: (myUsd - avg) / avg,
    diffVsMin: (myUsd - min) / min,
    cheaperThanMe: list.filter((p) => p < myUsd).length,
  };
}
