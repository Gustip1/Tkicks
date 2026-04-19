"use client";
import { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  Users, Clock, TrendingUp, Globe, Monitor, Smartphone, Tablet,
  ArrowUpRight, ArrowDownRight, Eye, RefreshCw, ShoppingCart,
  UserPlus, UserCheck, Zap, ChevronRight
} from 'lucide-react';

interface AnalyticsData {
  totalVisits: number;
  todayVisits: number;
  yesterdayVisits: number;
  uniqueVisitors: number;
  todayUniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  avgDuration: number;
  todayAvgDuration: number;
  bounceRate: number;
  todayBounceRate: number;
  pagesPerVisit: number;
  visitsByDevice: { device_type: string; count: number }[];
  visitsByBrowser: { browser: string; count: number }[];
  visitsByOS: { os: string; count: number }[];
  visitsByReferrer: { referrer_domain: string; count: number }[];
  visitsByPage: { page_path: string; count: number; avg_duration: number; bounce_rate: number }[];
  visitsByHour: { hour: number; count: number }[];
  todayByHour: { hour: number; count: number }[];
  visitsByDay: { day: number; day_name: string; count: number }[];
  visitsTrend: { date: string; count: number; unique: number }[];
  events: { event_name: string; count: number }[];
  conversionFunnel: {
    pageViews: number;
    addToCart: number;
    checkoutStarted: number;
    ordersPaid: number;
  };
  todayEvents: { event_name: string; count: number }[];
  liveVisitors: number;
  // Retention metrics
  scrollDepthAvg: number;
  scrollDepthBuckets: { label: string; count: number }[];
  durationBuckets: { label: string; count: number; pct: number }[];
  engagementRate: number; // % who stayed > 5s
  retentionSteps: { label: string; count: number; pct: number }[];
}

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'1d' | '7d' | '30d' | '90d'>('7d');
  const supabase = createBrowserClient();

  const loadAnalytics = async () => {
    setLoading(true);

    const daysAgo = dateRange === '1d' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    startDate.setHours(0, 0, 0, 0);
    const startDateStr = startDate.toISOString();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString();

    const fiveMinAgo = new Date();
    fiveMinAgo.setMinutes(fiveMinAgo.getMinutes() - 5);
    const fiveMinAgoStr = fiveMinAgo.toISOString();

    try {
      const { data: visits, count: totalVisits } = await supabase
        .from('analytics_visits')
        .select('*', { count: 'exact' })
        .gte('created_at', startDateStr);

      const { data: todayVisitsList } = await supabase
        .from('analytics_visits')
        .select('*')
        .gte('created_at', todayStr);

      const todayVisits = todayVisitsList?.length || 0;

      const { count: yesterdayVisits } = await supabase
        .from('analytics_visits')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterdayStr)
        .lt('created_at', todayStr);

      const { count: liveVisitors } = await supabase
        .from('analytics_visits')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fiveMinAgoStr);

      const visitsList = visits || [];
      const allVisitorIds = visitsList.map(v => v.visitor_id);
      const uniqueVisitors = new Set(allVisitorIds).size;

      const todayVisitorIds = (todayVisitsList || []).map(v => v.visitor_id);
      const todayUniqueVisitors = new Set(todayVisitorIds).size;

      const visitorCounts: Record<string, number> = {};
      visitsList.forEach(v => {
        const vid = v.visitor_id || 'unknown';
        visitorCounts[vid] = (visitorCounts[vid] || 0) + 1;
      });
      const newVisitors = Object.values(visitorCounts).filter(c => c === 1).length;
      const returningVisitors = Object.values(visitorCounts).filter(c => c > 1).length;

      const avgDuration = visitsList.length > 0
        ? visitsList.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) / visitsList.length
        : 0;

      const bounces = visitsList.filter(v => v.is_bounce).length;
      const bounceRate = visitsList.length > 0 ? (bounces / visitsList.length) * 100 : 0;

      const totalPages = visitsList.reduce((sum, v) => sum + (v.pages_viewed || 1), 0);
      const pagesPerVisit = visitsList.length > 0 ? totalPages / visitsList.length : 0;

      const todayList = todayVisitsList || [];
      const todayAvgDuration = todayList.length > 0
        ? todayList.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) / todayList.length
        : 0;
      const todayBounces = todayList.filter(v => v.is_bounce).length;
      const todayBounceRate = todayList.length > 0 ? (todayBounces / todayList.length) * 100 : 0;

      const deviceCounts: Record<string, number> = {};
      visitsList.forEach(v => {
        const device = v.device_type || 'unknown';
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      });
      const visitsByDevice = Object.entries(deviceCounts)
        .map(([device_type, count]) => ({ device_type, count }))
        .sort((a, b) => b.count - a.count);

      const browserCounts: Record<string, number> = {};
      visitsList.forEach(v => {
        const browser = v.browser || 'unknown';
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      });
      const visitsByBrowser = Object.entries(browserCounts)
        .map(([browser, count]) => ({ browser, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const osCounts: Record<string, number> = {};
      visitsList.forEach(v => {
        const os = v.os || 'unknown';
        osCounts[os] = (osCounts[os] || 0) + 1;
      });
      const visitsByOS = Object.entries(osCounts)
        .map(([os, count]) => ({ os, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const referrerCounts: Record<string, number> = {};
      visitsList.forEach(v => {
        const ref = v.referrer_domain || 'Directo';
        referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
      });
      const visitsByReferrer = Object.entries(referrerCounts)
        .map(([referrer_domain, count]) => ({ referrer_domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const pageCounts: Record<string, { count: number; totalDuration: number; bounces: number }> = {};
      visitsList.forEach(v => {
        const page = v.page_path || '/';
        if (!pageCounts[page]) pageCounts[page] = { count: 0, totalDuration: 0, bounces: 0 };
        pageCounts[page].count += 1;
        pageCounts[page].totalDuration += v.duration_seconds || 0;
        if (v.is_bounce) pageCounts[page].bounces += 1;
      });
      const visitsByPage = Object.entries(pageCounts)
        .map(([page_path, d]) => ({
          page_path,
          count: d.count,
          avg_duration: d.count > 0 ? d.totalDuration / d.count : 0,
          bounce_rate: d.count > 0 ? (d.bounces / d.count) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const hourCounts: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourCounts[i] = 0;
      visitsList.forEach(v => {
        const hour = new Date(v.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const visitsByHour = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => a.hour - b.hour);

      const todayHourCounts: Record<number, number> = {};
      for (let i = 0; i < 24; i++) todayHourCounts[i] = 0;
      todayList.forEach(v => {
        const hour = new Date(v.created_at).getHours();
        todayHourCounts[hour] = (todayHourCounts[hour] || 0) + 1;
      });
      const todayByHour = Object.entries(todayHourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => a.hour - b.hour);

      const dayCounts: Record<number, number> = {};
      for (let i = 0; i < 7; i++) dayCounts[i] = 0;
      visitsList.forEach(v => {
        const day = new Date(v.created_at).getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const visitsByDay = Object.entries(dayCounts)
        .map(([day, count]) => ({ day: parseInt(day), day_name: DAYS_ES[parseInt(day)], count }))
        .sort((a, b) => a.day - b.day);

      const dateCounts: Record<string, { total: number; visitors: Set<string> }> = {};
      visitsList.forEach(v => {
        const date = new Date(v.created_at).toISOString().split('T')[0];
        if (!dateCounts[date]) dateCounts[date] = { total: 0, visitors: new Set() };
        dateCounts[date].total += 1;
        if (v.visitor_id) dateCounts[date].visitors.add(v.visitor_id);
      });
      const visitsTrend = Object.entries(dateCounts)
        .map(([date, d]) => ({ date, count: d.total, unique: d.visitors.size }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const { data: eventsData } = await supabase
        .from('analytics_events')
        .select('event_name')
        .gte('created_at', startDateStr);

      const eventCounts: Record<string, number> = {};
      (eventsData || []).forEach(e => {
        eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
      });
      const events = Object.entries(eventCounts)
        .map(([event_name, count]) => ({ event_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const { data: todayEventsData } = await supabase
        .from('analytics_events')
        .select('event_name')
        .gte('created_at', todayStr);

      const todayEventCounts: Record<string, number> = {};
      (todayEventsData || []).forEach(e => {
        todayEventCounts[e.event_name] = (todayEventCounts[e.event_name] || 0) + 1;
      });
      const todayEvents = Object.entries(todayEventCounts)
        .map(([event_name, count]) => ({ event_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const conversionFunnel = {
        pageViews: totalVisits || 0,
        addToCart: eventCounts['add_to_cart'] || 0,
        checkoutStarted: eventCounts['checkout_started'] || eventCounts['checkout'] || 0,
        ordersPaid: eventCounts['order_paid'] || eventCounts['purchase'] || 0,
      };

      // ── Retention & Engagement metrics ──
      const exitedVisits = visitsList.filter(v => v.exited_at);

      // Scroll depth
      const scrollValues = exitedVisits.map(v => v.scroll_depth ?? 0);
      const scrollDepthAvg = scrollValues.length > 0
        ? scrollValues.reduce((s, v) => s + v, 0) / scrollValues.length
        : 0;

      const scrollBucketDefs = [
        { label: '0%', min: 0, max: 0 },
        { label: '1–25%', min: 1, max: 25 },
        { label: '26–50%', min: 26, max: 50 },
        { label: '51–75%', min: 51, max: 75 },
        { label: '76–100%', min: 76, max: 100 },
      ];
      const scrollDepthBuckets = scrollBucketDefs.map(b => ({
        label: b.label,
        count: scrollValues.filter(v => v >= b.min && v <= b.max).length,
      }));

      // Duration buckets
      const durations = exitedVisits.map(v => v.duration_seconds ?? 0);
      const total = durations.length || 1;
      const durBucketDefs = [
        { label: '< 5s', min: 0, max: 4 },
        { label: '5–15s', min: 5, max: 15 },
        { label: '15–30s', min: 16, max: 30 },
        { label: '30s–1m', min: 31, max: 60 },
        { label: '1–3m', min: 61, max: 180 },
        { label: '> 3m', min: 181, max: Infinity },
      ];
      const durationBuckets = durBucketDefs.map(b => {
        const count = durations.filter(d => d >= b.min && d <= b.max).length;
        return { label: b.label, count, pct: (count / total) * 100 };
      });

      // Engagement rate = % who stayed > 5s
      const engaged = durations.filter(d => d >= 5).length;
      const engagementRate = total > 0 ? (engaged / total) * 100 : 0;

      // Retention funnel
      const retentionThresholds = [
        { label: 'Entraron', sec: 0 },
        { label: '> 5 seg', sec: 5 },
        { label: '> 15 seg', sec: 15 },
        { label: '> 30 seg', sec: 30 },
        { label: '> 1 min', sec: 60 },
      ];
      const retentionSteps = retentionThresholds.map(t => {
        const count = durations.filter(d => d >= t.sec).length;
        return { label: t.label, count, pct: (count / total) * 100 };
      });

      setData({
        totalVisits: totalVisits || 0,
        todayVisits,
        yesterdayVisits: yesterdayVisits || 0,
        uniqueVisitors,
        todayUniqueVisitors,
        newVisitors,
        returningVisitors,
        avgDuration,
        todayAvgDuration,
        bounceRate,
        todayBounceRate,
        pagesPerVisit,
        visitsByDevice,
        visitsByBrowser,
        visitsByOS,
        visitsByReferrer,
        visitsByPage,
        visitsByHour,
        todayByHour,
        visitsByDay,
        visitsTrend,
        events,
        conversionFunnel,
        todayEvents,
        liveVisitors: liveVisitors || 0,
        scrollDepthAvg,
        scrollDepthBuckets,
        durationBuckets,
        engagementRate,
        retentionSteps,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    let interval: NodeJS.Timeout | null = null;
    if (dateRange === '1d') {
      interval = setInterval(loadAnalytics, 60000);
    }
    return () => { if (interval) clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
  };

  const peakHour = useMemo(() => {
    if (!data?.visitsByHour.length) return null;
    return data.visitsByHour.reduce((max, h) => h.count > max.count ? h : max, data.visitsByHour[0]);
  }, [data?.visitsByHour]);

  const peakDay = useMemo(() => {
    if (!data?.visitsByDay.length) return null;
    return data.visitsByDay.reduce((max, d) => d.count > max.count ? d : max, data.visitsByDay[0]);
  }, [data?.visitsByDay]);

  const todayPeakHour = useMemo(() => {
    if (!data?.todayByHour.length) return null;
    return data.todayByHour.reduce((max, h) => h.count > max.count ? h : max, data.todayByHour[0]);
  }, [data?.todayByHour]);

  const todayChangePercent = useMemo(() => {
    if (!data || data.yesterdayVisits === 0) return null;
    return ((data.todayVisits - data.yesterdayVisits) / data.yesterdayVisits * 100);
  }, [data]);

  const maxHourCount = Math.max(...(data?.visitsByHour.map(h => h.count) || [1]), 1);
  const maxTodayHourCount = Math.max(...(data?.todayByHour.map(h => h.count) || [1]), 1);
  const maxTrendCount = Math.max(...(data?.visitsTrend.map(t => t.count) || [1]), 1);
  const maxDayCount = Math.max(...(data?.visitsByDay.map(d => d.count) || [1]), 1);

  const getDeviceIcon = (device: string) => {
    if (device === 'mobile') return <Smartphone className="w-4 h-4" />;
    if (device === 'tablet') return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  const getDeviceLabel = (device: string) => {
    if (device === 'mobile') return 'Celular';
    if (device === 'tablet') return 'Tablet';
    if (device === 'desktop') return 'Computadora';
    return device;
  };

  const getPageLabel = (path: string) => {
    const map: Record<string, string> = {
      '/': 'Inicio',
      '/productos': 'Productos',
      '/ofertas': 'Ofertas',
      '/encargos': 'Encargos',
      '/nosotros': 'Nosotros',
      '/checkout': 'Checkout',
      '/sorteo': 'Sorteo',
    };
    if (map[path]) return map[path];
    if (path.startsWith('/producto/')) return `Producto: ${path.replace('/producto/', '')}`;
    return path;
  };

  const getReferrerIcon = (ref: string) => {
    if (ref === 'Directo') return '🔗';
    if (ref.includes('instagram')) return '📸';
    if (ref.includes('google')) return '🔍';
    if (ref.includes('facebook')) return '👥';
    if (ref.includes('whatsapp')) return '💬';
    if (ref.includes('tiktok')) return '🎵';
    return '🌐';
  };

  const getEventLabel = (name: string) => {
    const map: Record<string, string> = {
      add_to_cart: '🛒 Carrito',
      checkout_started: '💳 Checkout',
      checkout: '💳 Checkout',
      order_paid: '✅ Pagado',
      purchase: '✅ Pagado',
      page_view: '👁 Vista',
    };
    return map[name] || name.replace(/_/g, ' ');
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-300" />
        <p className="text-sm text-gray-400">Cargando estadísticas...</p>
      </div>
    );
  }

  const activeHours = dateRange === '1d' ? data?.todayByHour : data?.visitsByHour;
  const activePeakHour = dateRange === '1d' ? todayPeakHour : peakHour;
  const maxActiveHour = dateRange === '1d' ? maxTodayHourCount : maxHourCount;

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analíticas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(data?.liveVisitors ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700">{data!.liveVisitors} en línea ahora</span>
            </div>
          )}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['1d', '7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${dateRange === r ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {r === '1d' ? 'Hoy' : r === '7d' ? '7 días' : r === '30d' ? '30 días' : '90 días'}
              </button>
            ))}
          </div>
          <button
            onClick={loadAnalytics}
            disabled={loading}
            title="Actualizar"
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Resumen inteligente ── */}
      {data && (
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-blue-100 rounded-2xl p-5 space-y-2">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Resumen rápido
          </h2>
          <ul className="space-y-1.5 text-sm text-gray-600">
            {(() => {
              const insights: string[] = [];
              const br = dateRange === '1d' ? (data.todayBounceRate ?? 0) : (data.bounceRate ?? 0);
              const dur = dateRange === '1d' ? (data.todayAvgDuration ?? 0) : (data.avgDuration ?? 0);
              const visits = dateRange === '1d' ? data.todayVisits : data.totalVisits;
              const topDevice = data.visitsByDevice[0];
              const topRef = data.visitsByReferrer[0];

              if (visits === 0) {
                insights.push('Todavía no hay visitas en este período.');
              } else {
                if (br >= 70) insights.push(`El ${br.toFixed(0)}% de la gente se va sin explorar. Esto indica que el primer impacto no está enganchando lo suficiente.`);
                else if (br >= 50) insights.push(`El ${br.toFixed(0)}% se va rápido. Hay que mejorar lo primero que ven al entrar.`);
                else insights.push(`Solo el ${br.toFixed(0)}% se va sin explorar. La mayoría se queda y navega.`);

                if (dur < 5) insights.push(`La gente se queda en promedio ${Math.round(dur)} segundos. Es muy poco: no llegan a ver los productos.`);
                else if (dur < 30) insights.push(`Promedio de ${Math.round(dur)} segundos por visita. Hay interés pero se pierde rápido.`);
                else insights.push(`Promedio de ${formatDuration(dur)} por visita. Buen nivel de exploración.`);

                if (topDevice) {
                  const pct = ((topDevice.count / (data.totalVisits || 1)) * 100).toFixed(0);
                  const label = topDevice.device_type === 'mobile' ? 'celular' : topDevice.device_type === 'desktop' ? 'computadora' : 'tablet';
                  insights.push(`El ${pct}% entra desde ${label}. ${topDevice.device_type === 'mobile' ? 'La experiencia mobile es clave.' : ''}`);
                }

                if (topRef) {
                  insights.push(`La principal fuente de tráfico es ${topRef.referrer_domain === 'Directo' ? 'tráfico directo (ponen la URL o te tienen guardado)' : topRef.referrer_domain}.`);
                }

                if (todayChangePercent !== null && dateRange === '1d') {
                  if (todayChangePercent > 20) insights.push(`Hoy está ${todayChangePercent.toFixed(0)}% por encima de ayer. Buen día.`);
                  else if (todayChangePercent < -20) insights.push(`Hoy hay ${Math.abs(todayChangePercent).toFixed(0)}% menos visitas que ayer.`);
                }
              }

              return insights.map((ins, i) => <li key={i} className="flex items-start gap-2"><span className="text-blue-400 mt-0.5 shrink-0">&#8226;</span>{ins}</li>);
            })()}
          </ul>
        </div>
      )}

      {/* ── KPIs principales ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Visitas totales"
          value={(dateRange === '1d' ? data?.todayVisits : data?.totalVisits) ?? 0}
          sub={dateRange === '1d' && todayChangePercent !== null
            ? { pct: todayChangePercent, text: 'vs ayer' }
            : dateRange !== '1d' ? { text: `Hoy: ${data?.todayVisits ?? 0}` } : undefined}
          icon={<Eye className="w-5 h-5" />}
          accent="blue"
        />
        <KpiCard
          label="Personas únicas"
          value={(dateRange === '1d' ? data?.todayUniqueVisitors : data?.uniqueVisitors) ?? 0}
          sub={{ text: `${data?.newVisitors ?? 0} nuevas · ${data?.returningVisitors ?? 0} repiten` }}
          icon={<Users className="w-5 h-5" />}
          accent="violet"
        />
        <KpiCard
          label="Tiempo promedio"
          value={formatDuration(dateRange === '1d' ? (data?.todayAvgDuration ?? 0) : (data?.avgDuration ?? 0))}
          sub={{ text: `${(data?.pagesPerVisit ?? 0).toFixed(1)} páginas por visita` }}
          icon={<Clock className="w-5 h-5" />}
          accent="amber"
          isText
        />
        <KpiCard
          label="Se van rápido"
          value={`${(dateRange === '1d' ? (data?.todayBounceRate ?? 0) : (data?.bounceRate ?? 0)).toFixed(0)}%`}
          sub={{ text: dateRange === '1d' ? (data?.todayBounceRate ?? 0) >= 60 ? 'Hay que mejorar el enganche' : 'Buen enganche' : (data?.bounceRate ?? 0) >= 60 ? 'Hay que mejorar el enganche' : 'Buen enganche' }}
          icon={<Zap className="w-5 h-5" />}
          accent="rose"
          isText
        />
      </div>

      {/* ── Gráfico de actividad ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-gray-900">
              {dateRange === '1d' ? 'Actividad de hoy por hora' : 'Visitas por día'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {dateRange === '1d'
                ? `Hora pico: ${activePeakHour ? `${activePeakHour.hour.toString().padStart(2, '0')}:00 (${activePeakHour.count} visitas)` : 'sin datos'}`
                : `Día más activo: ${peakDay?.day_name ?? 'sin datos'}`
              }
            </p>
          </div>
          {dateRange === '1d' && (
            <span className="text-xs text-gray-400">
              Ahora: {new Date().getHours().toString().padStart(2, '0')}:{new Date().getMinutes().toString().padStart(2, '0')}
            </span>
          )}
        </div>

        {dateRange === '1d' ? (
          /* Hourly bars */
          <div className="flex items-end gap-[3px] h-36">
            {activeHours?.map((h) => {
              const currentHour = new Date().getHours();
              const isCurrent = (h as {hour:number}).hour === currentHour;
              const isFuture = (h as {hour:number}).hour > currentHour;
              const pct = maxActiveHour > 0 ? ((h as {count:number}).count / maxActiveHour) * 100 : 0;
              return (
                <div key={(h as {hour:number}).hour} className="flex-1 flex flex-col items-center group relative">
                  <div className="hidden group-hover:flex absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 flex-col items-center">
                    {(h as {hour:number}).hour.toString().padStart(2, '0')}:00
                    <span className="font-bold">{(h as {count:number}).count} visitas</span>
                  </div>
                  <div
                    className={`w-full rounded-t-md transition-all ${isCurrent ? 'bg-emerald-500' : isFuture ? 'bg-gray-100' : 'bg-blue-500 hover:bg-blue-600'}`}
                    style={{ height: `${Math.max(pct, isFuture ? 0 : (h as {count:number}).count > 0 ? 3 : 0)}%`, minHeight: (h as {count:number}).count > 0 ? '4px' : undefined }}
                  />
                  {(h as {hour:number}).hour % 4 === 0 && (
                    <span className={`text-[10px] mt-1 ${isCurrent ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                      {(h as {hour:number}).hour.toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Daily trend bars */
          <div className="flex items-end gap-[3px] h-36">
            {data?.visitsTrend.map((t, i) => {
              const pct = maxTrendCount > 0 ? (t.count / maxTrendCount) * 100 : 0;
              const show = data.visitsTrend.length <= 14 || i % Math.ceil(data.visitsTrend.length / 10) === 0;
              return (
                <div key={t.date} className="flex-1 flex flex-col items-center group relative">
                  <div className="hidden group-hover:flex absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 flex-col items-center">
                    {formatDate(t.date)}
                    <span className="font-bold">{t.count} visitas</span>
                  </div>
                  <div
                    className="w-full bg-blue-500 hover:bg-blue-600 rounded-t-md transition-all"
                    style={{ height: `${Math.max(pct, t.count > 0 ? 3 : 0)}%` }}
                  />
                  {show && <span className="text-[9px] text-gray-400 mt-1">{formatDate(t.date)}</span>}
                </div>
              );
            })}
          </div>
        )}

        {dateRange === '1d' && (
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />Pasadas</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />Hora actual</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-100 inline-block" />Por venir</span>
          </div>
        )}
      </div>

      {/* ── Embudo de conversión ── */}
      {(data?.conversionFunnel.addToCart ?? 0) > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">¿Cuántos llegan a comprar?</h2>
          <p className="text-xs text-gray-400 mb-5">De cada 100 visitantes, así avanza el proceso</p>
          <div className="flex items-end gap-3">
            {[
              { label: 'Visitaron la web', value: data?.conversionFunnel.pageViews ?? 0, color: 'bg-blue-500', emoji: '👁' },
              { label: 'Agregaron al carrito', value: data?.conversionFunnel.addToCart ?? 0, color: 'bg-amber-500', emoji: '🛒' },
              { label: 'Fueron al checkout', value: data?.conversionFunnel.checkoutStarted ?? 0, color: 'bg-purple-500', emoji: '💳' },
              { label: 'Completaron la compra', value: data?.conversionFunnel.ordersPaid ?? 0, color: 'bg-emerald-500', emoji: '✅' },
            ].map((step, i, arr) => {
              const base = arr[0].value || 1;
              const pct = ((step.value / base) * 100).toFixed(1);
              const dropPct = i > 0 ? ((step.value / (arr[i-1].value || 1)) * 100).toFixed(0) : null;
              return (
                <div key={step.label} className="flex-1 flex flex-col items-center gap-2">
                  {i > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <ChevronRight className="w-3 h-3" />
                      <span>{dropPct}% continúa</span>
                    </div>
                  )}
                  <div className="w-full flex flex-col items-center">
                    <div
                      className={`w-full ${step.color} rounded-xl transition-all`}
                      style={{ height: `${Math.max((step.value / base) * 120, step.value > 0 ? 8 : 0)}px` }}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">{step.value.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-tight">{step.emoji} {step.label}</div>
                    {i > 0 && <div className="text-xs text-gray-400 mt-0.5">{pct}% del total</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Fila media: Páginas + Fuentes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Páginas más vistas */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Páginas más visitadas</h2>
          <p className="text-xs text-gray-400 mb-4">Las secciones que más atraen</p>
          <div className="space-y-3">
            {(data?.visitsByPage.length ?? 0) === 0 && (
              <p className="text-sm text-gray-400">Sin datos todavía</p>
            )}
            {data?.visitsByPage.map((page, i) => (
              <div key={page.page_path}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
                    <span className="text-sm font-medium text-gray-800 truncate">{getPageLabel(page.page_path)}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{formatDuration(page.avg_duration)}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 shrink-0 ml-2">{page.count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(page.count / (data.visitsByPage[0]?.count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Origen de visitas */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">¿De dónde vienen?</h2>
          <p className="text-xs text-gray-400 mb-4">Fuentes que traen tráfico a la tienda</p>
          <div className="space-y-3">
            {(data?.visitsByReferrer.length ?? 0) === 0 && (
              <p className="text-sm text-gray-400">Sin datos todavía</p>
            )}
            {data?.visitsByReferrer.map((ref, i) => (
              <div key={ref.referrer_domain}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{getReferrerIcon(ref.referrer_domain)}</span>
                    <span className="text-sm font-medium text-gray-800 truncate">{ref.referrer_domain}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 shrink-0 ml-2">{ref.count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${(ref.count / (data.visitsByReferrer[0]?.count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dispositivos + Días de la semana ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Dispositivos */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">¿Con qué dispositivo entran?</h2>
          <p className="text-xs text-gray-400 mb-5">Importante para saber si el diseño mobile es clave</p>
          <div className="space-y-4">
            {data?.visitsByDevice.map((d) => {
              const pct = ((d.count / (data.totalVisits || 1)) * 100);
              return (
                <div key={d.device_type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{getDeviceIcon(d.device_type)}</span>
                      <span className="text-sm font-medium text-gray-800">{getDeviceLabel(d.device_type)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{d.count} visitas</span>
                      <span className="text-sm font-bold text-gray-900">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Días de la semana */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">¿Qué día vienen más?</h2>
          <p className="text-xs text-gray-400 mb-5">
            {peakDay ? `El día más activo es el ${peakDay.day_name}` : 'Acumulado del período seleccionado'}
          </p>
          <div className="flex items-end gap-2 h-28">
            {data?.visitsByDay.map((d) => {
              const pct = maxDayCount > 0 ? (d.count / maxDayCount) * 100 : 0;
              const isPeak = d.count === maxDayCount && d.count > 0;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center group relative">
                  <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    {d.count} visitas
                  </div>
                  <div
                    className={`w-full rounded-t-md transition-all ${isPeak ? 'bg-violet-500' : 'bg-violet-200 hover:bg-violet-400'}`}
                    style={{ height: `${Math.max(pct, d.count > 0 ? 5 : 0)}%` }}
                  />
                  <span className={`text-[10px] mt-1.5 font-medium ${isPeak ? 'text-violet-600' : 'text-gray-400'}`}>
                    {d.day_name.slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Nuevos vs recurrentes + Eventos ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Nuevos vs recurrentes */}
        {data && (data.newVisitors > 0 || data.returningVisitors > 0) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 mb-1">¿Son clientes nuevos o fieles?</h2>
            <p className="text-xs text-gray-400 mb-5">Visitantes únicos del período</p>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">Primera vez</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {data.newVisitors} · {data.uniqueVisitors > 0 ? ((data.newVisitors / data.uniqueVisitors) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${data.uniqueVisitors > 0 ? (data.newVisitors / data.uniqueVisitors) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-gray-700">Volvieron a visitar</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {data.returningVisitors} · {data.uniqueVisitors > 0 ? ((data.returningVisitors / data.uniqueVisitors) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.uniqueVisitors > 0 ? (data.returningVisitors / data.uniqueVisitors) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Eventos */}
        {((dateRange === '1d' ? data?.todayEvents : data?.events) || []).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Acciones realizadas</h2>
            <p className="text-xs text-gray-400 mb-5">Qué hicieron los visitantes</p>
            <div className="grid grid-cols-2 gap-3">
              {(dateRange === '1d' ? data?.todayEvents : data?.events)?.map((ev) => (
                <div key={ev.event_name} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                  <div className="text-xl leading-none">{getEventLabel(ev.event_name).split(' ')[0]}</div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{ev.count}</div>
                    <div className="text-xs text-gray-500 leading-tight">{getEventLabel(ev.event_name).split(' ').slice(1).join(' ') || ev.event_name.replace(/_/g, ' ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── RETENCIÓN ── */}
      {data && (data.retentionSteps[0]?.count ?? 0) > 0 && (
        <>
          <div className="pt-2">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold text-gray-900">Retención: ¿la gente se queda?</h2>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                data.engagementRate >= 50 ? 'bg-emerald-50 text-emerald-700' :
                data.engagementRate >= 25 ? 'bg-amber-50 text-amber-700' :
                'bg-rose-50 text-rose-700'
              }`}>
                {data.engagementRate >= 50 ? 'Bien' : data.engagementRate >= 25 ? 'Regular' : 'Bajo'} — {data.engagementRate.toFixed(0)}% se quedan +5s
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {data.engagementRate < 25
                ? 'La mayoría se va antes de los 5 segundos. El hero y el primer scroll tienen que atrapar al instante.'
                : data.engagementRate < 50
                ? 'Casi la mitad se va rápido. Mejorar lo primero que ven puede subir estas cifras.'
                : 'La mayoría explora la web. El contenido está funcionando.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Embudo de retención */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-semibold text-gray-900 mb-1">¿Cuántos se quedan?</h2>
              <p className="text-xs text-gray-400 mb-5">De todas las visitas, cuántas superan cada umbral de tiempo</p>
              <div className="space-y-3">
                {data.retentionSteps.map((step, i) => {
                  const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500'];
                  return (
                    <div key={step.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{step.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{step.count} personas</span>
                          <span className="text-sm font-bold text-gray-900">{step.pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all`} style={{ width: `${step.pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distribución de tiempo */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-semibold text-gray-900 mb-1">¿Cuánto tiempo se quedan?</h2>
              <p className="text-xs text-gray-400 mb-5">Distribución de duración de las visitas</p>
              <div className="space-y-3">
                {data.durationBuckets.map((b) => {
                  const maxPct = Math.max(...data.durationBuckets.map(x => x.pct), 1);
                  const isTop = b.pct === maxPct;
                  return (
                    <div key={b.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${isTop ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>{b.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{b.count}</span>
                          <span className="text-sm font-bold text-gray-900">{b.pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isTop ? 'bg-rose-500' : 'bg-blue-400'}`} style={{ width: `${(b.pct / maxPct) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Scroll depth */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-gray-900">¿Hasta dónde bajan en la página?</h2>
              <span className="text-sm font-bold text-gray-600">Promedio: {data.scrollDepthAvg.toFixed(0)}%</span>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              {data.scrollDepthAvg < 25
                ? 'La mayoría no baja de la primera pantalla — el contenido de arriba debe retener mejor'
                : data.scrollDepthAvg < 50
                ? 'Llegan hasta la mitad — algo bueno hay, pero se pierden a la mitad'
                : 'Buen scroll — la gente explora bastante tu sitio'}
            </p>
            <div className="flex items-end gap-3 h-28">
              {data.scrollDepthBuckets.map((b) => {
                const maxBucket = Math.max(...data.scrollDepthBuckets.map(x => x.count), 1);
                const pct = (b.count / maxBucket) * 100;
                const colors = ['bg-rose-400', 'bg-amber-400', 'bg-yellow-400', 'bg-cyan-400', 'bg-emerald-500'];
                const idx = data.scrollDepthBuckets.indexOf(b);
                return (
                  <div key={b.label} className="flex-1 flex flex-col items-center group relative">
                    <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {b.count} visitas
                    </div>
                    <div className={`w-full ${colors[idx]} rounded-t-lg transition-all`} style={{ height: `${Math.max(pct, b.count > 0 ? 5 : 0)}%` }} />
                    <span className="text-[10px] text-gray-500 font-medium mt-1.5">{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
}

/* ── KPI Card ── */
function KpiCard({
  label, value, sub, icon, accent, isText = false,
}: {
  label: string;
  value: number | string;
  sub?: { pct?: number; text?: string };
  icon: React.ReactNode;
  accent: 'blue' | 'violet' | 'amber' | 'rose';
  isText?: boolean;
}) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg[accent]}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">
          {isText ? value : typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {sub && (
          <div className="flex items-center gap-1 mt-1">
            {sub.pct !== undefined && (
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${sub.pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {sub.pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(sub.pct).toFixed(1)}%
              </span>
            )}
            {sub.text && <span className="text-xs text-gray-400">{sub.text}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
