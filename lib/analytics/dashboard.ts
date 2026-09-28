/**
 * Criterios del panel de analíticas: rangos de fecha, cómo se agrupan las
 * fuentes de tráfico y cómo se nombran las secciones. Todo lo que convierte
 * los datos crudos en algo que se entiende de un vistazo vive acá.
 */

export type RangeKey = 'today' | 'yesterday' | '7d' | '30d' | '90d' | '365d';

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: '90d', label: '90 días' },
  { key: '365d', label: '1 año' },
];

export interface Period {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  /** true para Hoy y Ayer: la tendencia se muestra por hora, no por día. */
  singleDay: boolean;
  /** Cómo se nombra el período anterior en las comparaciones. */
  prevLabel: string;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Rango en hora local (la del admin, Argentina), con inicio y FIN.
 * - Hoy:  desde las 00:00 hasta ahora; se compara con ayer hasta la misma hora.
 * - Ayer: el día completo; se compara con anteayer completo.
 * - N días: hoy más los N-1 días anteriores completos; se compara con los N previos.
 * Antes los rangos no tenían fin y "7 días" arrancaba a la hora actual de
 * hace una semana, así que no había forma de ver un día cerrado.
 */
export function periodFor(key: RangeKey, now = new Date()): Period {
  const today = startOfDay(now);

  if (key === 'today') {
    const elapsed = now.getTime() - today.getTime();
    const prevStart = addDays(today, -1);
    return {
      start: today, end: now,
      prevStart, prevEnd: new Date(prevStart.getTime() + elapsed),
      singleDay: true, prevLabel: 'ayer a esta hora',
    };
  }
  if (key === 'yesterday') {
    const start = addDays(today, -1);
    return {
      start, end: today,
      prevStart: addDays(today, -2), prevEnd: start,
      singleDay: true, prevLabel: 'anteayer',
    };
  }
  const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[key];
  const start = addDays(today, -(days - 1));
  const span = now.getTime() - start.getTime();
  return {
    start, end: now,
    prevStart: new Date(start.getTime() - span), prevEnd: start,
    singleDay: false, prevLabel: `los ${days} días anteriores`,
  };
}

/** Dominios propios: una visita "desde" ellos es navegación interna, no una fuente. */
const OWN_DOMAINS = /(^|\.)tkicks\.com\.ar$|(^|\.)tkicks\.com$|\.vercel\.app$|^localhost$|^127\.0\.0\.1$/i;

/**
 * Agrupa los dominios de referencia en fuentes que se entienden.
 * Instagram llegaba partido en 4 ("l.instagram.com", "instagram.com"…) y el
 * propio dominio de la tienda figuraba como si fuera tráfico externo.
 */
export function sourceName(domain: string | null | undefined): string {
  const d = (domain || '').toLowerCase().trim();
  if (!d || OWN_DOMAINS.test(d)) return 'Directo o guardado';
  if (d.includes('instagram')) return 'Instagram';
  if (d.includes('facebook') || d === 'fb.me') return 'Facebook';
  if (d.includes('tiktok')) return 'TikTok';
  if (d.includes('whatsapp') || d === 'wa.me') return 'WhatsApp';
  if (d.includes('google')) return 'Google';
  if (/bing|yahoo|duckduckgo|brave|ecosia|yandex|baidu/.test(d)) return 'Otros buscadores';
  if (d.includes('chatgpt') || d.includes('openai') || d.includes('perplexity') || d.includes('claude.ai')) return 'Asistentes de IA';
  if (d.includes('youtube')) return 'YouTube';
  if (d.includes('twitter') || d === 't.co' || d === 'x.com') return 'X (Twitter)';
  return d.replace(/^www\./, '');
}

/** true si la visita viene de la propia tienda (no cuenta como fuente). */
export function isOwnDomain(domain: string | null | undefined): boolean {
  return !!domain && OWN_DOMAINS.test(domain.toLowerCase());
}

const SECTION_NAMES: Record<string, string> = {
  '': 'Inicio',
  productos: 'Catálogo',
  'nuevos-ingresos': 'Nuevos ingresos',
  ofertas: 'Ofertas',
  subastas: 'Subastas',
  encargos: 'Encargos',
  nosotros: 'Nosotros',
  checkout: 'Checkout',
  track: 'Seguimiento de pedido',
  orders: 'Mis pedidos',
  account: 'Mi cuenta',
  login: 'Ingreso',
  register: 'Registro',
  sorteo: 'Sorteo',
};

/** "/subastas/abc" → "Subastas". Agrupa por la primera parte de la ruta. */
export function sectionName(path: string | null | undefined): string {
  const first = (path || '/').split('?')[0].split('/').filter(Boolean)[0] ?? '';
  return SECTION_NAMES[first] ?? `/${first}`;
}

/** Eventos de campañas que ya terminaron: no aportan y confunden. */
export const LEGACY_EVENTS = new Set(['cuartito_ticket_click']);

export type StockStatus = 'in_stock' | 'sold_out' | 'removed';
