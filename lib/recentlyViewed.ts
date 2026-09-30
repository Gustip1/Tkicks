/**
 * "Seguí donde lo dejaste": los últimos productos que miró esta persona.
 *
 * Vive en el localStorage del navegador del cliente (no en la base): es una
 * comodidad personal, no un dato del negocio. Guarda una foto mínima del
 * producto para poder mostrarlo sin consultar nada; el precio en pesos se
 * recalcula con el dólar del día al mostrarlo.
 *
 * Un 14% de las visitas son de gente que vuelve (septiembre 2026): para ellos
 * es el atajo más corto a lo que ya les había interesado.
 */

export interface RecentItem {
  slug: string;
  title: string;
  image: string | null;
  price: number;
  salePrice: number | null;
  at: number;
}

const KEY = 'tkicks_recent_v1';
const MAX = 12;
/** Pasados 2 días, lo visto deja de mostrarse (y se borra al guardar el próximo).
 *  Más tiempo se volvía repetitivo para quien entra seguido. */
const TTL_MS = 2 * 24 * 60 * 60 * 1000;

function read(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as RecentItem[]) : [];
    const since = Date.now() - TTL_MS;
    return Array.isArray(list) ? list.filter((x) => Number(x?.at) > since) : [];
  } catch {
    return [];
  }
}

export function rememberProduct(p: {
  slug: string;
  title: string;
  images?: { url: string }[] | null;
  price: number | string;
  sale_price?: number | string | null;
}) {
  if (typeof window === 'undefined' || !p?.slug) return;
  const item: RecentItem = {
    slug: p.slug,
    title: p.title,
    image: p.images?.[0]?.url ?? null,
    price: Number(p.price),
    salePrice: p.sale_price != null && Number(p.sale_price) > 0 ? Number(p.sale_price) : null,
    at: Date.now(),
  };
  try {
    const list = [item, ...read().filter((x) => x.slug !== item.slug)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Almacenamiento lleno o bloqueado: no pasa nada, es una comodidad
  }
}

/** Los vistos, del más reciente al más viejo, sin el que se está mirando ahora. */
export function getRecent(excludeSlug?: string): RecentItem[] {
  return read().filter((x) => x.slug !== excludeSlug);
}

/** Saca un producto de la lista (por ejemplo, si ya no existe). */
export function forgetProduct(slug: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(read().filter((x) => x.slug !== slug)));
  } catch {
    /* sin almacenamiento */
  }
}
