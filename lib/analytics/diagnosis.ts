/**
 * "¿Dónde se pierden las ventas?" — el diagnóstico del panel de analíticas.
 *
 * Toma las visitas y eventos del período y devuelve las fugas del recorrido de
 * compra, ordenadas por cuánta gente se pierde en cada una, cada una con qué
 * hacer. Es una función pura para poder probarla sin base de datos.
 *
 * Criterios:
 * - "Se fue enseguida" se mide con los hitos de tiempo que se mandan EN VIVO
 *   (engaged_5s), no con la duración de salida: el navegador de Instagram
 *   muchas veces cierra sin mandar la salida y esas visitas quedarían en 0 s.
 * - Contacto = WhatsApp, oferta o link de cuotas: la mayoría de las ventas se
 *   cierra por ahí, así que quien consulta no cuenta como "perdido".
 */

export type SlugStatus = 'in_stock' | 'sold_out' | 'removed';

export interface DiagVisit {
  session_id: string;
  page_path: string | null;
  created_at: string;
  user_agent: string | null;
}

export interface DiagEvent {
  session_id: string;
  event_name: string;
  page_path?: string | null;
  event_data?: Record<string, unknown> | null;
}

export interface Leak {
  key: 'quick_exit' | 'catalog_no_click' | 'removed_product' | 'pdp_no_action' | 'cart_abandon';
  title: string;
  /** Personas (sesiones) que se pierden en este punto */
  lost: number;
  /** Sobre cuántas se mide */
  of: number;
  detail: string;
  action: string;
}

export interface Diagnosis {
  leaks: Leak[];
  /** Productos con stock que abren mucho y nadie agrega ni consulta */
  viewedNoAction: { slug: string; sessions: number }[];
}

const CONTACT = new Set(['whatsapp_click', 'offer_requested', 'installments_link_requested']);
const CATALOG = new Set(['/productos', '/nuevos-ingresos', '/ofertas']);

const path = (p: string | null | undefined) => (p || '/').split('?')[0];
const slugOf = (p: string) => (p.startsWith('/producto/') ? decodeURIComponent(p.slice('/producto/'.length)).toLowerCase() : null);
const fromInstagram = (ua: string | null) => /instagram/i.test(ua || '');

export function diagnose(
  visits: DiagVisit[],
  events: DiagEvent[],
  statusBySlug: Record<string, SlugStatus>
): Diagnosis {
  const bySession = new Map<string, DiagVisit[]>();
  for (const v of visits) {
    const list = bySession.get(v.session_id);
    if (list) list.push(v);
    else bySession.set(v.session_id, [v]);
  }
  bySession.forEach((list) => list.sort((a, b) => a.created_at.localeCompare(b.created_at)));

  const evBySession = new Map<string, DiagEvent[]>();
  for (const e of events) {
    const list = evBySession.get(e.session_id);
    if (list) list.push(e);
    else evBySession.set(e.session_id, [e]);
  }
  const did = (sid: string, pred: (e: DiagEvent) => boolean) => (evBySession.get(sid) ?? []).some(pred);
  const contacted = (sid: string) => did(sid, (e) => CONTACT.has(e.event_name));
  const carted = (sid: string) => did(sid, (e) => e.event_name === 'add_to_cart');
  const status = (slug: string): SlugStatus => statusBySlug[slug] ?? 'removed';

  const leaks: Leak[] = [];

  // 1. Entran por la portada y se van en menos de 5 s sin abrir nada
  const homeEntries = [...bySession.entries()].filter(([, l]) => path(l[0].page_path) === '/');
  const quick = homeEntries.filter(
    ([sid, l]) => l.length === 1 && !did(sid, (e) => e.event_name === 'engaged_5s' && path(e.page_path) === '/')
  );
  if (homeEntries.length) {
    const ig = quick.filter(([, l]) => fromInstagram(l[0].user_agent)).length;
    leaks.push({
      key: 'quick_exit',
      title: 'Entran a la portada y se van en menos de 5 segundos',
      lost: quick.length,
      of: homeEntries.length,
      detail: quick.length
        ? `${Math.round((ig / quick.length) * 100)}% de ellos llega desde la app de Instagram.`
        : 'Nadie se fue tan rápido en este período.',
      action:
        'Vienen de Instagram a ver productos: la primera pantalla del celular tiene que mostrarlos sin bajar. Si el número sube de golpe, revisá que la web cargue rápido.',
    });
  }

  // 2. Recorren el catálogo y no abren ningún producto
  const catalogSessions = [...bySession.entries()].filter(([, l]) => l.some((v) => CATALOG.has(path(v.page_path))));
  const catalogNoClick = catalogSessions.filter(([, l]) => !l.some((v) => path(v.page_path).startsWith('/producto/')));
  if (catalogSessions.length) {
    leaks.push({
      key: 'catalog_no_click',
      title: 'Miran el catálogo y no abren ningún producto',
      lost: catalogNoClick.length,
      of: catalogSessions.length,
      detail: 'Recorren la grilla pero nada los convence de tocar.',
      action:
        'Fotos de producto con fondo limpio y el precio en pesos a la vista. Los productos con stock y recién llegados, primero.',
    });
  }

  // 3. Llegan a productos que ya no existen (links viejos de Instagram o Google)
  const productSessions = [...bySession.entries()].filter(([, l]) => l.some((v) => path(v.page_path).startsWith('/producto/')));
  const removedOnly = productSessions.filter(([sid, l]) => {
    const slugs = l.map((v) => slugOf(path(v.page_path))).filter(Boolean) as string[];
    return slugs.length > 0 && slugs.every((s) => status(s) === 'removed') && !carted(sid) && !contacted(sid);
  });
  if (productSessions.length) {
    leaks.push({
      key: 'removed_product',
      title: 'Abren un producto que ya borraste',
      lost: removedOnly.length,
      of: productSessions.length,
      detail: 'Llegan por publicaciones viejas y ven que ya no está; casi todos se van ahí.',
      action:
        'Cuando se vende algo, dejalo sin stock en vez de borrarlo: la ficha sigue mostrando las fotos, ofrece parecidos y podés reponerlo. Mirá la lista "Los buscan y no los tenés".',
    });
  }

  // 4. Abren productos con stock y no agregan ni consultan
  const views: Record<string, Set<string>> = {};
  const actedSlugs = new Map<string, Set<string>>();
  for (const e of events) {
    const slug = typeof e.event_data?.slug === 'string' ? (e.event_data.slug as string).toLowerCase() : null;
    if (!slug || !(e.event_name === 'add_to_cart' || CONTACT.has(e.event_name))) continue;
    (actedSlugs.get(slug) ?? actedSlugs.set(slug, new Set()).get(slug)!).add(e.session_id);
  }
  const inStockSessions = productSessions.filter(([sid, l]) => {
    let any = false;
    for (const v of l) {
      const s = slugOf(path(v.page_path));
      if (s && status(s) === 'in_stock') {
        any = true;
        (views[s] ||= new Set()).add(sid);
      }
    }
    return any;
  });
  const noAction = inStockSessions.filter(([sid]) => !carted(sid) && !contacted(sid));
  if (inStockSessions.length) {
    leaks.push({
      key: 'pdp_no_action',
      title: 'Abren productos con stock y no agregan ni consultan',
      lost: noAction.length,
      of: inStockSessions.length,
      detail: 'Les interesó lo suficiente para abrirlo, pero ahí se frena.',
      action:
        'Precio en pesos y talles disponibles arriba de todo, y WhatsApp a mano para preguntar el talle. Revisá los productos de la lista "Miran mucho y nadie agrega".',
    });
  }

  // 5. Agregan al carrito y no terminan
  const cartSessions = [...evBySession.keys()].filter((sid) => carted(sid));
  const abandoned = cartSessions.filter((sid) => !did(sid, (e) => e.event_name === 'purchase') && !contacted(sid));
  if (cartSessions.length) {
    leaks.push({
      key: 'cart_abandon',
      title: 'Agregan al carrito y no compran',
      lost: abandoned.length,
      of: cartSessions.length,
      detail: `${cartSessions.filter((sid) => did(sid, (e) => e.event_name === 'checkout_started')).length} llegaron al formulario de compra.`,
      action: 'Pocos casos, pero son los más calientes: el checkout tiene que pedir lo mínimo y mostrar el total en pesos desde el principio.',
    });
  }

  const viewedNoAction = Object.entries(views)
    .map(([slug, set]) => ({ slug, sessions: set.size, acted: actedSlugs.get(slug)?.size ?? 0 }))
    .filter((p) => p.acted === 0 && p.sessions >= 3)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 6)
    .map(({ slug, sessions }) => ({ slug, sessions }));

  return { leaks: leaks.filter((l) => l.of > 0).sort((a, b) => b.lost - a.lost), viewedNoAction };
}
