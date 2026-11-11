import { sectionName } from './dashboard';

/**
 * Carrito, checkout y salida: qué productos se agregan al carrito, cuánto
 * tardan del carrito al checkout y en qué momento se van de la web (pedido del
 * dueño, nov 2026). Función pura, como diagnosis.ts, para probarla sin base.
 *
 * Criterios:
 * - "Persona" = el visitor_id del navegador, que viaja en event_data; si falta,
 *   la sesión. Quien agrega hoy y vuelve mañana a pagar cuenta una sola vez y
 *   con su demora real (cada pestaña nueva es otra sesión).
 * - Los tiempos van en mediana: un carrito olvidado tres días no arrastra el
 *   número como lo haría un promedio.
 * - En qué momento se van: cada visita va a la etapa más avanzada a la que
 *   llegó (compró > checkout > consultó > carrito > miró productos > nada), así
 *   las etapas no se pisan y suman el total.
 */

export interface JourneyVisit {
  session_id: string;
  page_path: string | null;
  created_at: string;
  exited_at: string | null;
  duration_seconds: number | null;
}

export interface JourneyEvent {
  session_id: string;
  event_name: string;
  created_at: string;
  event_data?: Record<string, unknown> | null;
}

export interface CartProduct {
  slug: string;
  title: string;
  /** Veces que se agregó (una persona puede agregarlo más de una vez) */
  adds: number;
  /** Personas distintas que lo agregaron */
  people: number;
  /** De esas, cuántas entraron al checkout después de agregarlo */
  toCheckout: number;
  /** Talles más agregados, el primero es el más pedido */
  sizes: string[];
}

export interface CartTiming {
  /** Personas que agregaron algo al carrito */
  people: number;
  /** De esas, cuántas entraron al checkout después */
  toCheckout: number;
  /** Mediana, en segundos, entre el primer agregado y el checkout */
  medianToCheckout: number | null;
  buckets: { label: string; count: number }[];
  /** Personas que entraron al checkout */
  checkoutPeople: number;
  /** De esas, cuántas compraron después */
  bought: number;
  /** Mediana, en segundos, entre entrar al checkout y comprar */
  medianToBuy: number | null;
}

export type ExitStageKey = 'browse' | 'product' | 'cart' | 'contacted' | 'checkout' | 'bought';

export interface ExitStage {
  key: ExitStageKey;
  label: string;
  sessions: number;
  /** Tiempo típico en la web antes de irse; null si ninguna registró su salida */
  medianSeconds: number | null;
}

export interface CartJourney {
  products: CartProduct[];
  timing: CartTiming;
  exitStages: ExitStage[];
  exitPages: { label: string; sessions: number }[];
  sessions: number;
}

const CONTACT = new Set(['whatsapp_click', 'offer_requested', 'installments_link_requested']);
// El evento puede llegar un instante antes que el que lo provocó: se tolera
const TOLERANCE_MS = 2000;

const ms = (iso: string) => new Date(iso).getTime();
const path = (p: string | null | undefined) => (p || '/').split('?')[0];

function personOf(e: JourneyEvent): string {
  const v = e.event_data?.visitor_id;
  return typeof v === 'string' && v ? v : e.session_id;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Momentos de un evento por persona, ordenados */
function timesByPerson(events: JourneyEvent[], name: string): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const e of events) {
    if (e.event_name !== name) continue;
    const list = map.get(personOf(e));
    if (list) list.push(ms(e.created_at));
    else map.set(personOf(e), [ms(e.created_at)]);
  }
  map.forEach((list) => list.sort((a, b) => a - b));
  return map;
}

/** El primer momento de la lista que no es anterior a `from` */
function firstFrom(list: number[] | undefined, from: number): number | null {
  if (!list) return null;
  return list.find((t) => t >= from - TOLERANCE_MS) ?? null;
}

const BUCKETS: { label: string; upTo: number }[] = [
  { label: 'Menos de 1 minuto', upTo: 60 },
  { label: '1 a 5 minutos', upTo: 5 * 60 },
  { label: '5 a 30 minutos', upTo: 30 * 60 },
  { label: '30 minutos a 1 día', upTo: 24 * 3600 },
  { label: 'Más de un día', upTo: Infinity },
];

const STAGES: { key: ExitStageKey; label: string }[] = [
  { key: 'browse', label: 'Sin abrir ningún producto' },
  { key: 'product', label: 'Mirando productos, sin agregar nada' },
  { key: 'cart', label: 'Con algo en el carrito, sin ir al checkout' },
  { key: 'contacted', label: 'Después de consultarte' },
  { key: 'checkout', label: 'En el checkout, sin terminar la compra' },
  { key: 'bought', label: 'Después de comprar' },
];

export function cartJourney(visits: JourneyVisit[], events: JourneyEvent[]): CartJourney {
  const checkouts = timesByPerson(events, 'checkout_started');
  const purchases = timesByPerson(events, 'purchase');

  // ── Qué agregan al carrito ──
  const products = new Map<
    string,
    { title: string; adds: number; firstAdd: Map<string, number>; sizes: Map<string, number> }
  >();
  const firstAdd = new Map<string, number>();
  for (const e of events) {
    if (e.event_name !== 'add_to_cart') continue;
    const slug = String(e.event_data?.slug ?? '').trim();
    if (!slug) continue;
    const person = personOf(e);
    const at = ms(e.created_at);
    let p = products.get(slug);
    if (!p) {
      p = { title: String(e.event_data?.title ?? slug), adds: 0, firstAdd: new Map(), sizes: new Map() };
      products.set(slug, p);
    }
    p.adds += 1;
    if (!p.firstAdd.has(person) || at < p.firstAdd.get(person)!) p.firstAdd.set(person, at);
    const size = String(e.event_data?.size ?? '').trim();
    if (size) p.sizes.set(size, (p.sizes.get(size) ?? 0) + 1);
    if (!firstAdd.has(person) || at < firstAdd.get(person)!) firstAdd.set(person, at);
  }

  const productList: CartProduct[] = [...products.entries()]
    .map(([slug, p]) => ({
      slug,
      title: p.title,
      adds: p.adds,
      people: p.firstAdd.size,
      toCheckout: [...p.firstAdd.entries()].filter(([person, at]) => firstFrom(checkouts.get(person), at) !== null).length,
      sizes: [...p.sizes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s),
    }))
    .sort((a, b) => b.people - a.people || b.adds - a.adds);

  // ── Del carrito al checkout, y del checkout a la compra ──
  const toCheckout: number[] = [];
  const bucketCounts = BUCKETS.map(() => 0);
  let neverCheckout = 0;
  firstAdd.forEach((at, person) => {
    const c = firstFrom(checkouts.get(person), at);
    if (c === null) {
      neverCheckout += 1;
      return;
    }
    const seconds = Math.max(0, (c - at) / 1000);
    toCheckout.push(seconds);
    bucketCounts[BUCKETS.findIndex((b) => seconds < b.upTo)] += 1;
  });

  const toBuy: number[] = [];
  checkouts.forEach((list, person) => {
    const b = firstFrom(purchases.get(person), list[0]);
    if (b !== null) toBuy.push(Math.max(0, (b - list[0]) / 1000));
  });

  const timing: CartTiming = {
    people: firstAdd.size,
    toCheckout: toCheckout.length,
    medianToCheckout: median(toCheckout),
    buckets: [
      ...BUCKETS.map((b, i) => ({ label: b.label, count: bucketCounts[i] })),
      { label: 'No fueron al checkout', count: neverCheckout },
    ],
    checkoutPeople: checkouts.size,
    bought: toBuy.length,
    medianToBuy: median(toBuy),
  };

  // ── En qué momento se van ──
  const visitsBySession = new Map<string, JourneyVisit[]>();
  for (const v of visits) {
    const list = visitsBySession.get(v.session_id);
    if (list) list.push(v);
    else visitsBySession.set(v.session_id, [v]);
  }
  const eventsBySession = new Map<string, Set<string>>();
  for (const e of events) {
    const set = eventsBySession.get(e.session_id);
    if (set) set.add(e.event_name);
    else eventsBySession.set(e.session_id, new Set([e.event_name]));
  }

  const stageDurations = new Map<ExitStageKey, number[]>(STAGES.map((s) => [s.key, []]));
  const stageCounts = new Map<ExitStageKey, number>(STAGES.map((s) => [s.key, 0]));
  const lastPages = new Map<string, number>();

  visitsBySession.forEach((rows, sid) => {
    const did = eventsBySession.get(sid) ?? new Set<string>();
    const sawProduct = rows.some((r) => path(r.page_path).startsWith('/producto/'));
    const stage: ExitStageKey = did.has('purchase')
      ? 'bought'
      : did.has('checkout_started')
        ? 'checkout'
        : [...did].some((n) => CONTACT.has(n))
          ? 'contacted'
          : did.has('add_to_cart')
            ? 'cart'
            : sawProduct
              ? 'product'
              : 'browse';
    stageCounts.set(stage, stageCounts.get(stage)! + 1);

    // La salida se registra al ocultar la pestaña: la duración más larga es la final
    const closed = rows.filter((r) => r.exited_at && r.duration_seconds !== null);
    if (closed.length) stageDurations.get(stage)!.push(Math.max(...closed.map((r) => r.duration_seconds ?? 0)));

    const last = rows.reduce((a, b) => (b.created_at > a.created_at ? b : a));
    const p = path(last.page_path);
    const label = p.startsWith('/producto/') ? 'Ficha de un producto' : sectionName(p);
    lastPages.set(label, (lastPages.get(label) ?? 0) + 1);
  });

  return {
    products: productList,
    timing,
    exitStages: STAGES.map((s) => ({
      key: s.key,
      label: s.label,
      sessions: stageCounts.get(s.key)!,
      medianSeconds: median(stageDurations.get(s.key)!),
    })),
    exitPages: [...lastPages.entries()]
      .map(([label, sessions]) => ({ label, sessions }))
      .sort((a, b) => b.sessions - a.sessions),
    sessions: visitsBySession.size,
  };
}
