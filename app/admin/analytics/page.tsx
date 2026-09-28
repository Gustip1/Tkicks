"use client";
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, MotionConfig } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase/client';
import { RefreshCw, Smartphone, Monitor, Tablet, Info, PackageX, PackageMinus } from 'lucide-react';
import { isBotUserAgent } from '@/lib/analytics/bots';
import {
  RANGES, RangeKey, periodFor, sourceName, sectionName, LEGACY_EVENTS, StockStatus,
} from '@/lib/analytics/dashboard';
import {
  AnimatedNumber, BarList, Card, Delta, Funnel, HourChart, RangeTabs, Skeleton,
  StatTile, TrendChart, TrendPoint, SERIES,
} from '@/components/admin/analytics/charts';

/* ────────────────────────────────────────────────────────────────────────────
   Panel de analíticas.

   Criterios de precisión (por qué los números son los que son):

   1. Una "visita" es una SESIÓN, no una fila: cada cambio de página inserta
      una fila nueva para la misma sesión.
   2. Duración, rebote y scroll sólo sobre las sesiones que mandaron el beacon
      de salida (exited_at); se muestra la cobertura. Mediana además del promedio.
   3. El embudo se mide en sesiones únicas en todos los pasos.
   4. La conversión real incluye los contactos (WhatsApp, ofertas, cuotas).
   5. Sin robots: los rastreadores ejecutaban la página y eran el 11% de las
      "visitas", recorriendo todas las fichas (también las de productos
      borrados). Se descartan por user agent, y el tracker ya no los registra.
   6. Los rangos tienen inicio y FIN en hora local, así "Ayer" es un día cerrado.
   7. Los productos se cruzan con el catálogo: los que siguen a la venta van por
      un lado y los que la gente busca pero ya no tenés (borrados o sin stock)
      por otro, porque eso es demanda para reponer, no ruido.
   ──────────────────────────────────────────────────────────────────────── */

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Eventos que significan "esta persona quiso comprar / negociar" */
const LEAD_EVENTS = ['whatsapp_click', 'offer_requested', 'installments_link_requested'];

const EVENT_LABELS: Record<string, string> = {
  whatsapp_click: 'Consultas por WhatsApp',
  offer_requested: 'Ofertas enviadas',
  installments_link_requested: 'Pidieron link de 3 cuotas',
  add_to_cart: 'Agregados al carrito',
  checkout_started: 'Checkouts iniciados',
  purchase: 'Órdenes creadas',
  product_card_click: 'Clicks en productos',
  homepage_banner_click: 'Clicks en el banner de la home',
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function formatDuration(seconds: number): string {
  if (!seconds) return '0 s';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins} min ${secs} s`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}
/** "kith-lax-black-tee" → "Kith lax black tee", para productos que ya no están en el catálogo */
function prettySlug(slug: string) {
  const t = decodeURIComponent(slug).replace(/[-_]+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const nf = new Intl.NumberFormat('es-AR');
const fmtInt = (n: number) => nf.format(Math.round(n));
const fmtUsd = (n: number) => `USD ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)}`;
const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const fmtPct = (n: number) => `${n.toFixed(n < 10 ? 1 : 0)}%`;

/**
 * Trae TODAS las filas: Supabase corta en 1000 por request, así que hay que
 * paginar. Las páginas se piden en paralelo, en tandas.
 */
async function fetchAll<T>(
  count: number,
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
  hardLimit = 80000
): Promise<T[]> {
  const page = 1000;
  const total = Math.min(count, hardLimit);
  if (total <= 0) return [];
  const ranges: [number, number][] = [];
  for (let from = 0; from < total; from += page) ranges.push([from, from + page - 1]);
  const out: T[] = [];
  const CONCURRENCY = 8;
  for (let i = 0; i < ranges.length; i += CONCURRENCY) {
    const batch = await Promise.all(ranges.slice(i, i + CONCURRENCY).map(([f, t]) => build(f, t)));
    batch.forEach((r) => { if (r.data) out.push(...r.data); });
  }
  return out;
}
async function countRows(q: PromiseLike<{ count: number | null }>): Promise<number> {
  const { count } = await q;
  return count ?? 0;
}

interface VisitRow {
  session_id: string;
  visitor_id: string | null;
  page_path: string | null;
  device_type: string | null;
  referrer_domain: string | null;
  user_agent: string | null;
  duration_seconds: number | null;
  is_bounce: boolean | null;
  scroll_depth: number | null;
  exited_at: string | null;
  created_at: string;
}
interface EventRow {
  session_id: string;
  event_name: string;
  created_at: string;
}
interface ViewedProduct {
  slug: string;
  title: string;
  image: string | null;
  sessions: number;
  status: StockStatus;
}

interface Stats {
  coverage: number;
  sessions: number;
  visitors: number;
  recurring: number;
  prevSessions: number;
  live: number;
  botsExcluded: number;

  leadSessions: number;
  prevLeadSessions: number;

  funnel: { label: string; hint: string; count: number }[];
  leadBreakdown: { name: string; label: string; count: number }[];

  orders: number;
  revenue: number;
  avgTicket: number;
  revenueAllTime: number;
  ordersAllTime: number;

  avgDuration: number;
  medianDuration: number;
  bounceRate: number;
  avgScroll: number;
  pagesPerSession: number;

  bySource: { source: string; sessions: number; leads: number }[];
  byDevice: { device: string; sessions: number }[];
  byPage: { section: string; sessions: number }[];
  viewedAvailable: ViewedProduct[];
  viewedUnavailable: ViewedProduct[];
  topSold: { title: string; units: number; revenue: number }[];
  byDay: { day: string; sessions: number }[];
  byHour: { hour: number; sessions: number }[];
  trend: TrendPoint[];
  otherEvents: { label: string; count: number }[];
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [range, setRange] = useState<RangeKey>('30d');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const supabase = createBrowserClient();
    const period = periodFor(range);
    const { start, end, prevStart, prevEnd, singleDay } = period;
    const [s0, s1, p0, p1] = [start, end, prevStart, prevEnd].map((d) => d.toISOString());
    const liveFrom = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    try {
      const [nVisits, nPrevVisits, nEvents, nPrevEvents] = await Promise.all([
        countRows(supabase.from('analytics_visits').select('*', { count: 'exact', head: true }).gte('created_at', s0).lt('created_at', s1)),
        countRows(supabase.from('analytics_visits').select('*', { count: 'exact', head: true }).gte('created_at', p0).lt('created_at', p1)),
        countRows(supabase.from('analytics_events').select('*', { count: 'exact', head: true }).gte('created_at', s0).lt('created_at', s1)),
        countRows(supabase.from('analytics_events').select('*', { count: 'exact', head: true }).gte('created_at', p0).lt('created_at', p1).in('event_name', LEAD_EVENTS)),
      ]);

      const [visitsRaw, prevVisitsRaw, eventsRaw, prevEventsRaw, liveRows, orders, items] = await Promise.all([
        fetchAll<VisitRow>(nVisits, (f, t) => supabase.from('analytics_visits')
          .select('session_id,visitor_id,page_path,device_type,referrer_domain,user_agent,duration_seconds,is_bounce,scroll_depth,exited_at,created_at')
          .gte('created_at', s0).lt('created_at', s1).range(f, t)),
        fetchAll<{ session_id: string; user_agent: string | null }>(nPrevVisits, (f, t) => supabase.from('analytics_visits')
          .select('session_id,user_agent')
          .gte('created_at', p0).lt('created_at', p1).range(f, t)),
        fetchAll<EventRow>(nEvents, (f, t) => supabase.from('analytics_events')
          .select('session_id,event_name,created_at')
          .gte('created_at', s0).lt('created_at', s1).range(f, t)),
        fetchAll<{ session_id: string }>(nPrevEvents, (f, t) => supabase.from('analytics_events')
          .select('session_id')
          .gte('created_at', p0).lt('created_at', p1).in('event_name', LEAD_EVENTS).range(f, t)),
        supabase.from('analytics_visits').select('session_id,user_agent').gte('created_at', liveFrom).limit(2000),
        supabase.from('orders').select('total,status,created_at').limit(5000),
        supabase.from('order_items')
          .select('title,price,quantity,orders!inner(created_at,status)')
          .gte('orders.created_at', s0).lt('orders.created_at', s1)
          .in('orders.status', ['paid', 'fulfilled']).limit(5000),
      ]);

      // ── Sin robots: se descartan sus sesiones y todos sus eventos ──
      const botSessions = new Set(visitsRaw.filter((v) => isBotUserAgent(v.user_agent)).map((v) => v.session_id));
      const prevBotSessions = new Set(prevVisitsRaw.filter((v) => isBotUserAgent(v.user_agent)).map((v) => v.session_id));
      const visits = visitsRaw.filter((v) => !botSessions.has(v.session_id));
      const events = eventsRaw.filter((e) => !botSessions.has(e.session_id) && !LEGACY_EVENTS.has(e.event_name));
      const prevEvents = prevEventsRaw.filter((e) => !prevBotSessions.has(e.session_id));

      // ── Sesiones: una fila por sesión, priorizando la que tiene exited_at ──
      const bySession = new Map<string, VisitRow>();
      visits.forEach((v) => {
        const prev = bySession.get(v.session_id);
        if (!prev || (!prev.exited_at && v.exited_at)) bySession.set(v.session_id, v);
      });
      const S = [...bySession.values()];
      const sessions = S.length;
      const closed = S.filter((v) => v.exited_at);

      const visitorIds = new Set(S.map((v) => v.visitor_id).filter(Boolean) as string[]);
      const perVisitor: Record<string, number> = {};
      S.forEach((v) => { if (v.visitor_id) perVisitor[v.visitor_id] = (perVisitor[v.visitor_id] || 0) + 1; });
      const recurring = Object.values(perVisitor).filter((c) => c > 1).length;

      // ── Embudo (sesiones únicas; cada paso incluye a los siguientes) ──
      const sessionsWith = (pred: (e: EventRow) => boolean) => new Set(events.filter(pred).map((e) => e.session_id));
      const productSessions = new Set(visits.filter((v) => v.page_path?.startsWith('/producto/')).map((v) => v.session_id));
      const cartSessions = sessionsWith((e) => e.event_name === 'add_to_cart');
      const checkoutSessions = sessionsWith((e) => e.event_name === 'checkout_started');
      const leadSet = sessionsWith((e) => LEAD_EVENTS.includes(e.event_name));

      const paidOrders = orders.data?.filter((o: any) => o.status === 'paid' || o.status === 'fulfilled') ?? [];
      const ordersInRange = paidOrders.filter((o: any) => {
        const d = new Date(o.created_at);
        return d >= start && d < end;
      });
      const revenue = ordersInRange.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);

      const intentSessions = new Set([...cartSessions, ...leadSet, ...checkoutSessions]);
      const interestSessions = new Set([...productSessions, ...intentSessions]);
      const funnel = [
        { label: 'Entraron a la web', hint: 'Visitas', count: sessions },
        { label: 'Se interesaron', hint: 'Abrieron un producto o preguntaron', count: interestSessions.size },
        { label: 'Quisieron comprar', hint: 'Carrito, WhatsApp, oferta o cuotas', count: intentSessions.size },
        { label: 'Iniciaron el checkout', hint: 'Llegaron al formulario', count: checkoutSessions.size },
        { label: 'Compraron', hint: 'Pedidos confirmados en la web', count: ordersInRange.length },
      ];

      const eventCounts: Record<string, number> = {};
      events.forEach((e) => { eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1; });
      const leadBreakdown = LEAD_EVENTS.map((name) => ({ name, label: EVENT_LABELS[name] ?? name, count: eventCounts[name] || 0 }))
        .sort((a, b) => b.count - a.count);

      // ── Comportamiento (sólo sesiones con datos de salida) ──
      const durations = closed.map((v) => v.duration_seconds || 0);
      const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      const bounceRate = pct(closed.filter((v) => v.is_bounce).length, closed.length);
      const scrolls = closed.map((v) => v.scroll_depth ?? 0);
      const avgScroll = scrolls.length ? scrolls.reduce((a, b) => a + b, 0) / scrolls.length : 0;

      // ── Fuentes agrupadas (Instagram en un solo renglón, sin el propio dominio) ──
      const srcMap: Record<string, { sessions: number; leads: number }> = {};
      S.forEach((v) => {
        const k = sourceName(v.referrer_domain);
        srcMap[k] ||= { sessions: 0, leads: 0 };
        srcMap[k].sessions += 1;
        if (leadSet.has(v.session_id)) srcMap[k].leads += 1;
      });
      const bySource = Object.entries(srcMap).map(([source, v]) => ({ source, ...v }))
        .sort((a, b) => b.sessions - a.sessions).slice(0, 8);

      const devMap: Record<string, number> = {};
      S.forEach((v) => { const k = v.device_type || 'desconocido'; devMap[k] = (devMap[k] || 0) + 1; });
      const byDevice = Object.entries(devMap).map(([device, n]) => ({ device, sessions: n })).sort((a, b) => b.sessions - a.sessions);

      // ── Secciones con nombre (no rutas) y productos ──
      const sectionSessions: Record<string, Set<string>> = {};
      const productPathSessions: Record<string, Set<string>> = {};
      visits.forEach((v) => {
        const p = (v.page_path || '/').split('?')[0];
        if (p.startsWith('/producto/')) {
          (productPathSessions[p.replace('/producto/', '')] ||= new Set()).add(v.session_id);
        } else {
          (sectionSessions[sectionName(p)] ||= new Set()).add(v.session_id);
        }
      });
      const byPage = Object.entries(sectionSessions).map(([section, set]) => ({ section, sessions: set.size }))
        .sort((a, b) => b.sessions - a.sessions).slice(0, 8);

      // Cruce con el catálogo: título real, foto y si todavía se puede vender
      const topSlugs = Object.entries(productPathSessions)
        .map(([slug, set]) => ({ slug, sessions: set.size }))
        .sort((a, b) => b.sessions - a.sessions).slice(0, 40);
      const { data: catalog } = topSlugs.length
        ? await supabase.from('products').select('slug,title,active,images,product_variants(stock)').in('slug', topSlugs.map((t) => t.slug))
        : { data: [] as any[] };
      const catalogBySlug = Object.fromEntries((catalog ?? []).map((p: any) => [p.slug, p]));
      const viewed: ViewedProduct[] = topSlugs.map(({ slug, sessions: n }) => {
        const p = catalogBySlug[slug];
        if (!p || !p.active) return { slug, title: p?.title ?? prettySlug(slug), image: p?.images?.[0]?.url ?? null, sessions: n, status: 'removed' };
        const stock = (p.product_variants ?? []).reduce((a: number, v: any) => a + (Number(v.stock) || 0), 0);
        return { slug, title: p.title, image: p.images?.[0]?.url ?? null, sessions: n, status: stock > 0 ? 'in_stock' : 'sold_out' };
      });
      const viewedAvailable = viewed.filter((v) => v.status === 'in_stock').slice(0, 8);
      const viewedUnavailable = viewed.filter((v) => v.status !== 'in_stock').slice(0, 8);

      const soldMap: Record<string, { title: string; units: number; revenue: number }> = {};
      (items.data ?? []).forEach((it: any) => {
        const k = it.title || '—';
        soldMap[k] ||= { title: k, units: 0, revenue: 0 };
        soldMap[k].units += Number(it.quantity) || 1;
        soldMap[k].revenue += Number(it.price || 0) * (Number(it.quantity) || 1);
      });
      const topSold = Object.values(soldMap).sort((a, b) => b.units - a.units).slice(0, 8);

      const dayCounts: Record<string, number> = {};
      const hourCounts: Record<number, number> = {};
      S.forEach((v) => {
        const d = new Date(v.created_at);
        dayCounts[DAYS_ES[d.getDay()]] = (dayCounts[DAYS_ES[d.getDay()]] || 0) + 1;
        hourCounts[d.getHours()] = (hourCounts[d.getHours()] || 0) + 1;
      });
      const byDay = DAYS_ES.map((d) => ({ day: d, sessions: dayCounts[d] || 0 }));
      const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, sessions: hourCounts[h] || 0 }));

      // ── Tendencia: por hora en Hoy/Ayer, por día en el resto, sin huecos ──
      const buckets = new Map<string, { label: string; visits: Set<string>; leads: Set<string> }>();
      if (singleDay) {
        const lastHour = range === 'today' ? new Date().getHours() : 23;
        for (let h = 0; h <= lastHour; h++) buckets.set(String(h), { label: `${h} hs`, visits: new Set(), leads: new Set() });
      } else {
        const fmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          buckets.set(dateKey(d), { label: fmt.format(d), visits: new Set(), leads: new Set() });
        }
      }
      S.forEach((v) => {
        const d = new Date(v.created_at);
        const b = buckets.get(singleDay ? String(d.getHours()) : dateKey(d));
        if (!b) return;
        b.visits.add(v.session_id);
        if (leadSet.has(v.session_id)) b.leads.add(v.session_id);
      });
      const trend: TrendPoint[] = [...buckets.entries()].map(([key, b]) => ({
        key, label: b.label, visits: b.visits.size, leads: b.leads.size,
      }));

      const otherEvents = Object.entries(eventCounts)
        .filter(([n]) => !n.startsWith('engaged_') && !LEAD_EVENTS.includes(n))
        .map(([n, count]) => ({ label: EVENT_LABELS[n] ?? n, count }))
        .sort((a, b) => b.count - a.count).slice(0, 6);

      const liveHumans = (liveRows.data ?? []).filter((v: any) => !isBotUserAgent(v.user_agent));

      setStats({
        coverage: pct(closed.length, sessions), sessions, visitors: visitorIds.size, recurring,
        prevSessions: new Set(prevVisitsRaw.filter((v) => !prevBotSessions.has(v.session_id)).map((v) => v.session_id)).size,
        live: new Set(liveHumans.map((v: any) => v.session_id)).size,
        botsExcluded: botSessions.size,
        leadSessions: leadSet.size, prevLeadSessions: new Set(prevEvents.map((e) => e.session_id)).size,
        funnel, leadBreakdown,
        orders: ordersInRange.length, revenue,
        avgTicket: ordersInRange.length ? revenue / ordersInRange.length : 0,
        revenueAllTime: paidOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0),
        ordersAllTime: paidOrders.length,
        avgDuration, medianDuration: median(durations), bounceRate, avgScroll,
        pagesPerSession: sessions ? visits.length / sessions : 0,
        bySource, byDevice, byPage, viewedAvailable, viewedUnavailable, topSold, byDay, byHour, trend, otherEvents,
      });
    } catch (err) {
      console.error('Error cargando analíticas:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const period = periodFor(range);

  return (
    <MotionConfig reducedMotion="user">
      <div className="-m-4 md:-m-6 min-h-full bg-[#f5f5f7] px-4 py-6 md:px-8 md:py-10 text-[#1d1d1f]">
        <div className="mx-auto max-w-[1280px] space-y-5 md:space-y-6">
          {/* ── Encabezado ── */}
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-[34px] leading-tight font-semibold tracking-[-0.02em]">Analíticas</h1>
              <p className="mt-1 flex items-center gap-2 text-[14px] text-[#6e6e73]">
                {stats && stats.live > 0 ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34c759] opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#34c759]" />
                    </span>
                    <span>
                      <span className="font-semibold text-[#1d1d1f]">{stats.live}</span>{' '}
                      {stats.live === 1 ? 'persona navegando ahora' : 'personas navegando ahora'}
                    </span>
                  </>
                ) : (
                  'Nadie navegando en los últimos 5 minutos'
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RangeTabs options={RANGES} value={range} onChange={setRange} />
              <button
                onClick={load}
                disabled={loading}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1d1d1f] transition-colors hover:bg-[#e8e8ed] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
                aria-label="Actualizar"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </header>

          {error && !stats && (
            <p className="rounded-[18px] bg-white p-6 text-[14px] text-[#6e6e73]">
              No se pudieron cargar las analíticas. Revisá la conexión y tocá actualizar.
            </p>
          )}

          {!stats && !error && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[168px]" />)}
              </div>
              <Skeleton className="h-[340px]" />
            </div>
          )}

          {stats && (
            // Al cambiar de rango se mantiene el marco y baja la opacidad: sin saltos
            <motion.div
              animate={{ opacity: loading ? 0.5 : 1 }}
              transition={{ duration: 0.25 }}
              className="space-y-5 md:space-y-6"
            >
              <Dashboard s={stats} prevLabel={period.prevLabel} singleDay={period.singleDay} />
            </motion.div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}

function Dashboard({ s, prevLabel, singleDay }: { s: Stats; prevLabel: string; singleDay: boolean }) {
  const trendVisits = s.trend.map((t) => t.visits);
  const trendLeads = s.trend.map((t) => t.leads);
  const spark = (arr: number[]) => arr.slice(-14);

  return (
    <>
      {/* ── Indicadores ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          index={0}
          label="Visitas"
          value={s.sessions}
          sub={`${fmtInt(s.visitors)} personas distintas`}
          delta={<Delta now={s.sessions} before={s.prevSessions} label={prevLabel} />}
          trend={spark(trendVisits)}
          trendColor={SERIES.visits}
        />
        <StatTile
          index={1}
          label="Te contactaron"
          value={s.leadSessions}
          sub={`${fmtPct(pct(s.leadSessions, s.sessions))} de las visitas`}
          delta={<Delta now={s.leadSessions} before={s.prevLeadSessions} label={prevLabel} />}
          trend={spark(trendLeads)}
          trendColor={SERIES.leads}
        />
        <StatTile
          index={2}
          label="Ventas en la web"
          value={s.orders}
          sub={s.orders ? `Ticket promedio ${fmtUsd(s.avgTicket)}` : 'Sin ventas web en el período'}
        />
        <StatTile
          index={3}
          label="Facturación"
          value={s.revenue}
          format={(n) => fmtUsd(n)}
          sub={`Histórico: ${fmtUsd(s.revenueAllTime)} en ${fmtInt(s.ordersAllTime)} ventas`}
        />
      </div>

      {/* ── Tendencia ── */}
      <Card
        title={singleDay ? 'Hora por hora' : 'Día a día'}
        help="Pasá el mouse por el gráfico para ver cada momento."
      >
        <TrendChart data={s.trend} />
      </Card>

      {/* ── Embudo + contactos ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr]">
        <Card
          title="¿En qué parte se cae la gente?"
          help="Cada paso cuenta visitas distintas y es parte del anterior, así los porcentajes cierran."
        >
          <Funnel steps={s.funnel} />
          <div className="mt-5 flex items-start gap-2.5 rounded-[12px] bg-[#f5f5f7] p-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc]" aria-hidden />
            <p className="text-[13px] leading-relaxed text-[#424245]">
              &quot;Quisieron comprar&quot; incluye WhatsApp, ofertas y pedidos de link de cuotas. La mayoría de tus
              ventas se cierra por ahí y no en el checkout web.
            </p>
          </div>
        </Card>
        <Card title="¿Cómo te contactaron?" help="Acciones de compra en el período.">
          <BarList color={SERIES.leads} rows={s.leadBreakdown.map((l) => ({ key: l.name, label: l.label, value: l.count }))} />
          {s.otherEvents.length > 0 && (
            <>
              <p className="mt-7 mb-3 text-[13px] font-semibold text-[#6e6e73]">Otras acciones</p>
              <BarList rows={s.otherEvents.map((e) => ({ key: e.label, label: e.label, value: e.count }))} />
            </>
          )}
        </Card>
      </div>

      {/* ── Fuentes + dispositivos ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr]">
        <Card
          title="¿De dónde viene la gente?"
          help="Y qué porcentaje de cada fuente terminó contactándote: te dice dónde conviene invertir."
        >
          {s.bySource.length === 0 ? (
            <p className="text-[13px] text-[#86868b]">Sin datos en este período.</p>
          ) : (
            <SourceTable rows={s.bySource} total={s.sessions} />
          )}
        </Card>
        <Card title="¿Con qué entran?">
          <Devices rows={s.byDevice} total={s.sessions} />
        </Card>
      </div>

      {/* ── Productos ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Productos más mirados" help="Sólo los que hoy están a la venta y con stock.">
          <ProductList items={s.viewedAvailable} empty="Ningún producto con stock recibió visitas en este período." />
        </Card>
        <Card
          title="Los buscan y no los tenés"
          help="Productos que la gente abrió pero ya borraste o están sin stock: es demanda para reponer."
        >
          <ProductList items={s.viewedUnavailable} empty="Todo lo que miraron está disponible." />
        </Card>
      </div>

      {/* ── Ventas por producto ── */}
      {s.topSold.length > 0 && (
        <Card title="Productos más vendidos" help="Sólo pedidos confirmados (pagados o entregados).">
          <BarList
            rows={s.topSold.map((p) => ({ key: p.title, label: p.title, value: p.units, extra: fmtUsd(p.revenue) }))}
            unit=" u."
          />
        </Card>
      )}

      {/* ── Secciones + horas ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Secciones más visitadas">
          <BarList rows={s.byPage.map((p) => ({ key: p.section, label: p.section, value: p.sessions }))} />
        </Card>
        <Card title="¿A qué hora entran?" help="Para elegir cuándo publicar o lanzar una promo.">
          <HourChart hours={s.byHour} />
        </Card>
      </div>

      {/* ── Comportamiento ── */}
      <Card
        title="¿Cuánto se quedan y cuánto miran?"
        help={`Sobre las visitas que registraron su salida (${fmtPct(s.coverage)} del total), para que las que no la registran no ensucien los promedios.`}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat label="Tiempo típico" value={s.medianDuration} format={formatDuration} note={`Promedio ${formatDuration(s.avgDuration)}`} />
          <MiniStat label="Se van enseguida" value={s.bounceRate} format={fmtPct} note="Una página y menos de 5 s" />
          <MiniStat label="Cuánto bajan" value={s.avgScroll} format={(n) => `${Math.round(n)}%`} note="De la página, en promedio" />
          <MiniStat label="Volvieron" value={s.recurring} note="Entraron más de una vez" />
        </div>
        {!singleDay && (
          <div className="mt-6">
            <p className="mb-3 text-[13px] font-semibold text-[#6e6e73]">Qué días entra más gente</p>
            <BarList rows={s.byDay.map((d) => ({ key: d.day, label: d.day, value: d.sessions }))} />
          </div>
        )}
      </Card>

      <p className="px-1 text-[12px] leading-relaxed text-[#86868b]">
        Páginas por visita: {s.pagesPerSession.toFixed(1)}. No se cuentan tu sesión de administrador ni los robots
        {s.botsExcluded > 0 && <> ({fmtInt(s.botsExcluded)} visitas de robots descartadas en este período)</>}.
      </p>
    </>
  );
}

/* ── Piezas propias del panel ─────────────────────────────────────────────── */

function MiniStat({ label, value, format, note }: { label: string; value: number; format?: (n: number) => string; note: string }) {
  return (
    <div className="rounded-[14px] bg-[#f5f5f7] p-4">
      <p className="text-[12px] font-semibold text-[#6e6e73]">{label}</p>
      <p className="mt-2 text-[26px] leading-none font-semibold tracking-[-0.02em]">
        <AnimatedNumber value={value} format={format} />
      </p>
      <p className="mt-1.5 text-[12px] text-[#6e6e73]">{note}</p>
    </div>
  );
}

function SourceTable({ rows, total }: { rows: { source: string; sessions: number; leads: number }[]; total: number }) {
  const max = Math.max(1, ...rows.map((r) => r.sessions));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-[14px]">
        <thead>
          <tr className="text-left text-[12px] text-[#6e6e73]">
            <th className="pb-3 font-semibold">Fuente</th>
            <th className="pb-3 font-semibold">Visitas</th>
            <th className="pb-3 text-right font-semibold">Contactos</th>
            <th className="pb-3 text-right font-semibold">Tasa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.source} className="border-t border-[#f0f0f2]">
              <td className="py-3 pr-3 font-semibold">{r.source}</td>
              <td className="py-3 pr-3 w-[42%]">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0f0f2]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: SERIES.visits }}
                      initial={{ width: 0 }}
                      animate={{ width: r.sessions ? `${Math.max((r.sessions / max) * 100, 1.5)}%` : '0%' }}
                      transition={{ duration: 0.9, ease: [0.28, 0.11, 0.32, 1], delay: 0.1 + i * 0.06 }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right tabular-nums">{fmtInt(r.sessions)}</span>
                </div>
                <span className="text-[11px] text-[#86868b]">{fmtPct(pct(r.sessions, total))} del total</span>
              </td>
              <td className="py-3 text-right tabular-nums">{fmtInt(r.leads)}</td>
              <td className={`py-3 text-right font-semibold tabular-nums ${r.leads ? 'text-[#1d1d1f]' : 'text-[#c7c7cc]'}`}>
                {fmtPct(pct(r.leads, r.sessions))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Devices({ rows, total }: { rows: { device: string; sessions: number }[]; total: number }) {
  const known = rows.filter((d) => ['mobile', 'desktop', 'tablet'].includes(d.device));
  if (!known.length) return <p className="text-[13px] text-[#86868b]">Sin datos en este período.</p>;
  const meta: Record<string, { name: string; Icon: typeof Smartphone }> = {
    mobile: { name: 'Celular', Icon: Smartphone },
    desktop: { name: 'Computadora', Icon: Monitor },
    tablet: { name: 'Tablet', Icon: Tablet },
  };
  return (
    <div>
      {/* Proporción en una sola barra, con 2px de separación entre tramos */}
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        {known.map((d, i) => (
          <motion.div
            key={d.device}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ background: SERIES.visits, opacity: 1 - i * 0.3 }}
            initial={{ width: 0 }}
            animate={{ width: `${pct(d.sessions, total)}%` }}
            transition={{ duration: 1, ease: [0.28, 0.11, 0.32, 1], delay: 0.15 + i * 0.1 }}
          />
        ))}
      </div>
      <ul className="mt-5 space-y-3">
        {known.map((d, i) => {
          const { name, Icon } = meta[d.device];
          return (
            <li key={d.device} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES.visits, opacity: 1 - i * 0.3 }} />
              <Icon className="h-4 w-4 text-[#6e6e73]" aria-hidden />
              <span className="flex-1 text-[14px]">{name}</span>
              <span className="text-[15px] font-semibold tabular-nums">
                <AnimatedNumber value={pct(d.sessions, total)} format={(n) => fmtPct(n)} />
              </span>
              <span className="w-20 text-right text-[12px] text-[#86868b] tabular-nums">{fmtInt(d.sessions)} visitas</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProductList({ items, empty }: { items: ViewedProduct[]; empty: string }) {
  if (!items.length) return <p className="text-[13px] text-[#86868b]">{empty}</p>;
  const max = Math.max(1, ...items.map((p) => p.sessions));
  return (
    <ul className="space-y-3">
      {items.map((p, i) => (
        <motion.li
          key={p.slug}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.28, 0.11, 0.32, 1], delay: 0.05 + i * 0.05 }}
          className="flex items-center gap-3"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[8px] bg-[#f5f5f7]">
            {p.image && <Image src={p.image} alt="" fill sizes="44px" className="object-contain mix-blend-multiply" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-[14px]">{p.title}</p>
              <p className="shrink-0 text-[14px] font-semibold tabular-nums">{fmtInt(p.sessions)}</p>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f0f0f2]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: SERIES.visits }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max((p.sessions / max) * 100, 2)}%` }}
                  transition={{ duration: 0.9, ease: [0.28, 0.11, 0.32, 1], delay: 0.15 + i * 0.05 }}
                />
              </div>
              {p.status !== 'in_stock' && <StockChip status={p.status} />}
            </div>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

function StockChip({ status }: { status: StockStatus }) {
  // Estado: ícono + texto, nunca sólo color
  if (status === 'sold_out') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#fff4e5] px-2 py-0.5 text-[11px] font-semibold text-[#b25000]">
        <PackageMinus className="h-3 w-3" aria-hidden /> Sin stock
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f0f0f2] px-2 py-0.5 text-[11px] font-semibold text-[#6e6e73]">
      <PackageX className="h-3 w-3" aria-hidden /> Ya no está
    </span>
  );
}
