import {
  CompetitorItem,
  CompetitorPlatform,
  CompetitorSite,
  Currency,
  normalizeSiteUrl,
  parseShopifySuggest,
  parseWooProducts,
  searchQuery,
} from '@/lib/competitors';

/**
 * Consulta las webs de la competencia desde el servidor. Solo la usa el panel
 * (/api/admin/competitors): pocas consultas, a pedido del dueño, guardadas 10
 * minutos para no repetirlas.
 *
 * Se identifica como un cliente automático genérico; no se hace pasar por un
 * navegador.
 */

const TIMEOUT_MS = 6000;
const CACHE_MS = 10 * 60 * 1000;
const LIMIT = 6;
const HEADERS = { Accept: 'application/json', 'User-Agent': 'PriceCheck/1.0' };

const cache = new Map<string, { at: number; items: CompetitorItem[] }>();

async function getJson(url: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal, redirect: 'follow', cache: 'no-store' });
    const type = res.headers.get('content-type') || '';
    const json = type.includes('json') ? await res.json().catch(() => null) : null;
    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false, status: 0, json: null };
  } finally {
    clearTimeout(timer);
  }
}

const shopifyUrl = (origin: string, q: string) =>
  `${origin}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=${LIMIT}&resources[options][unavailable_products]=last`;

const wooUrl = (origin: string, q: string) => `${origin}/wp-json/wc/store/v1/products?search=${encodeURIComponent(q)}&per_page=${LIMIT}`;

async function searchOnce(platform: CompetitorPlatform, origin: string, currency: Currency, q: string): Promise<CompetitorItem[] | null> {
  if (platform === 'shopify') {
    const r = await getJson(shopifyUrl(origin, q));
    return r.ok ? parseShopifySuggest(r.json, origin, currency) : null;
  }
  if (platform === 'woocommerce') {
    const r = await getJson(wooUrl(origin, q));
    return r.ok ? parseWooProducts(r.json, origin) : null;
  }
  return [];
}

export type SiteResult = { site: CompetitorSite; items: CompetitorItem[]; error: string | null; searchUrl: string };

/** Link para buscar a mano en la web (sirve en Shopify, WooCommerce y Tiendanube) */
export function manualSearchUrl(site: CompetitorSite, title: string): string {
  const q = encodeURIComponent(searchQuery(title));
  if (site.platform === 'woocommerce') return `${site.url}/?s=${q}&post_type=product`;
  return `${site.url}/search?q=${q}`;
}

export async function searchSite(site: CompetitorSite, title: string): Promise<SiteResult> {
  const searchUrl = manualSearchUrl(site, title);
  const origin = normalizeSiteUrl(site.url);
  if (!origin) return { site, items: [], error: 'La dirección de la web no es válida.', searchUrl };
  if (site.platform === 'manual') return { site, items: [], error: null, searchUrl };

  const key = `${site.platform}|${origin}|${title.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return { site, items: hit.items, error: null, searchUrl };

  // Primero el título más completo; si no encuentra nada, solo las primeras palabras
  const full = searchQuery(title, 6);
  let items = await searchOnce(site.platform, origin, site.currency, full);
  if (items && items.length === 0) {
    const short = searchQuery(title, 3);
    if (short && short !== full) items = await searchOnce(site.platform, origin, site.currency, short);
  }
  if (items === null) return { site, items: [], error: 'La web no respondió la búsqueda.', searchUrl };
  cache.set(key, { at: Date.now(), items });
  return { site, items, error: null, searchUrl };
}

/** Prueba cómo se puede leer una web: Shopify, WooCommerce o ninguna */
export async function detectPlatform(origin: string): Promise<CompetitorPlatform> {
  const shop = await getJson(shopifyUrl(origin, 'nike'));
  if (shop.ok && (shop.json as any)?.resources?.results) return 'shopify';
  const woo = await getJson(wooUrl(origin, 'nike'));
  if (woo.ok && Array.isArray(woo.json)) return 'woocommerce';
  return 'manual';
}
