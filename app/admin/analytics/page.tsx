"use client";
import { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  Globe, 
  Monitor,
  Smartphone,
  Tablet,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MousePointer,
  Calendar,
  BarChart3,
  RefreshCw,
  ShoppingCart,
  CreditCard,
  Package,
  UserPlus,
  UserCheck,
  Activity,
  Zap
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
}

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'1d' | '7d' | '30d' | '90d'>('1d');
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
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
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

  const maxHourCount = Math.max(...(data?.visitsByHour.map(h => h.count) || [1]));
  const maxDayCount = Math.max(...(data?.visitsByDay.map(d => d.count) || [1]));
  const maxTodayHourCount = Math.max(...(data?.todayByHour.map(h => h.count) || [1]));
  const maxTrendCount = Math.max(...(data?.visitsTrend.map(t => t.count) || [1]));

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const todayChangePercent = useMemo(() => {
    if (!data || data.yesterdayVisits === 0) return null;
    return ((data.todayVisits - data.yesterdayVisits) / data.yesterdayVisits * 100);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm">Estadísticas de visitas y comportamiento</p>
        </div>
        
        <div className="flex items-center gap-3">
          {data && data.liveVisitors > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700">
                {data.liveVisitors} en línea
              </span>
            </div>
          )}

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="1d">Hoy</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>
          
          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Today Summary Banner */}
      {dateRange === '1d' && data && (
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-green-400" />
            <span className="font-semibold text-lg">Resumen de Hoy</span>
            <span className="text-xs text-gray-400 ml-auto">
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-400 text-xs">Visitas</p>
              <p className="text-2xl font-bold">{data.todayVisits}</p>
              {todayChangePercent !== null && (
                <div className={`flex items-center gap-1 text-xs ${todayChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {todayChangePercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(todayChangePercent).toFixed(1)}% vs ayer
                </div>
              )}
            </div>
            <div>
              <p className="text-gray-400 text-xs">Visitantes Únicos</p>
              <p className="text-2xl font-bold">{data.todayUniqueVisitors}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Duración Prom.</p>
              <p className="text-2xl font-bold">{formatDuration(data.todayAvgDuration)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Tasa Rebote</p>
              <p className="text-2xl font-bold">{data.todayBounceRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard title="Total Visitas" value={data?.totalVisits || 0} icon={<Eye className="w-5 h-5" />} color="blue" />
        <StatCard title="Hoy" value={data?.todayVisits || 0} subtitle={data?.yesterdayVisits ? `Ayer: ${data.yesterdayVisits}` : undefined} icon={<Calendar className="w-5 h-5" />} color="green" trend={todayChangePercent} />
        <StatCard title="Únicos" value={data?.uniqueVisitors || 0} icon={<Users className="w-5 h-5" />} color="purple" />
        <StatCard title="Nuevos" value={data?.newVisitors || 0} icon={<UserPlus className="w-5 h-5" />} color="cyan" />
        <StatCard title="Recurrentes" value={data?.returningVisitors || 0} icon={<UserCheck className="w-5 h-5" />} color="indigo" />
        <StatCard title="Duración Prom." value={formatDuration(data?.avgDuration || 0)} icon={<Clock className="w-5 h-5" />} color="amber" isText />
        <StatCard title="Tasa Rebote" value={`${(data?.bounceRate || 0).toFixed(1)}%`} subtitle={`${(data?.pagesPerVisit || 0).toFixed(1)} págs/visita`} icon={<MousePointer className="w-5 h-5" />} color="red" isText />
      </div>

      {/* Peak Times */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 opacity-80" />
            <span className="font-medium opacity-90">Hora Pico {dateRange === '1d' ? '(Hoy)' : `(${dateRange})`}</span>
          </div>
          <div className="text-3xl font-bold">
            {dateRange === '1d' 
              ? (todayPeakHour ? `${todayPeakHour.hour.toString().padStart(2, '0')}:00` : '--:--')
              : (peakHour ? `${peakHour.hour.toString().padStart(2, '0')}:00` : '--:--')
            }
          </div>
          <div className="text-sm opacity-80 mt-1">
            {dateRange === '1d'
              ? (todayPeakHour ? `${todayPeakHour.count} visitas` : 'Sin datos')
              : (peakHour ? `${peakHour.count} visitas` : 'Sin datos')
            }
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 opacity-80" />
            <span className="font-medium opacity-90">Día Pico</span>
          </div>
          <div className="text-3xl font-bold">{peakDay?.day_name || 'Sin datos'}</div>
          <div className="text-sm opacity-80 mt-1">{peakDay ? `${peakDay.count} visitas` : 'Sin datos'}</div>
        </div>
      </div>

      {/* Today Hourly Chart */}
      {dateRange === '1d' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Actividad por Hora — Hoy
            <span className="ml-auto text-xs text-gray-400 font-normal">
              Hora actual: {new Date().getHours().toString().padStart(2, '0')}:{new Date().getMinutes().toString().padStart(2, '0')}
            </span>
          </h3>
          <div className="flex items-end gap-[3px] h-40">
            {data?.todayByHour.map((h) => {
              const currentHour = new Date().getHours();
              const isCurrentHour = h.hour === currentHour;
              const isFuture = h.hour > currentHour;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center group relative">
                  <div className="hidden group-hover:block absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    {h.hour.toString().padStart(2, '0')}:00 — {h.count} visitas
                  </div>
                  <div 
                    className={`w-full rounded-t transition-all ${isCurrentHour ? 'bg-green-500 hover:bg-green-600' : isFuture ? 'bg-gray-200' : 'bg-blue-500 hover:bg-blue-600'}`}
                    style={{ height: maxTodayHourCount > 0 ? `${(h.count / maxTodayHourCount) * 100}%` : '0%', minHeight: h.count > 0 ? '4px' : isFuture ? '2px' : '0' }}
                  />
                  {h.hour % 3 === 0 && (
                    <span className={`text-[10px] mt-1 ${isCurrentHour ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
                      {h.hour.toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" /> Completadas</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" /> Hora actual</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-200 rounded" /> Pendientes</div>
          </div>
        </div>
      )}

      {/* Visits Trend (multi-day) */}
      {dateRange !== '1d' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            Tendencia de Visitas
          </h3>
          <div className="flex items-end gap-[2px] h-40">
            {data?.visitsTrend.map((t, i) => (
              <div key={t.date} className="flex-1 flex flex-col items-center group relative">
                <div className="hidden group-hover:block absolute -top-10 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {formatDate(t.date)}: {t.count} visitas, {t.unique} únicos
                </div>
                <div className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600" style={{ height: `${(t.count / maxTrendCount) * 100}%`, minHeight: t.count > 0 ? '4px' : '0' }} />
                {(data?.visitsTrend.length || 0) <= 14 && (
                  <span className="text-[9px] text-gray-400 mt-1 truncate max-w-full">{formatDate(t.date)}</span>
                )}
                {(data?.visitsTrend.length || 0) > 14 && i % 7 === 0 && (
                  <span className="text-[9px] text-gray-400 mt-1">{formatDate(t.date)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Visitas por Hora {dateRange !== '1d' && `(${dateRange})`}
          </h3>
          <div className="flex items-end gap-1 h-32">
            {data?.visitsByHour.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center group relative">
                <div className="hidden group-hover:block absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {h.hour.toString().padStart(2, '0')}:00 — {h.count}
                </div>
                <div className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600" style={{ height: `${(h.count / maxHourCount) * 100}%`, minHeight: h.count > 0 ? '4px' : '0' }} />
                {h.hour % 6 === 0 && <span className="text-[10px] text-gray-400 mt-1">{h.hour}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Visitas por Día de Semana
          </h3>
          <div className="flex items-end gap-2 h-32">
            {data?.visitsByDay.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center group relative">
                <div className="hidden group-hover:block absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {d.day_name}: {d.count}
                </div>
                <div className="w-full bg-purple-500 rounded-t transition-all hover:bg-purple-600" style={{ height: `${(d.count / maxDayCount) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }} />
                <span className="text-[10px] text-gray-400 mt-1">{d.day_name.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      {(data?.conversionFunnel.addToCart || 0) > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-gray-400" />
            Embudo de Conversión
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Visitas', value: data?.conversionFunnel.pageViews || 0, color: 'bg-blue-500' },
              { label: 'Agregar al Carrito', value: data?.conversionFunnel.addToCart || 0, color: 'bg-amber-500' },
              { label: 'Checkout', value: data?.conversionFunnel.checkoutStarted || 0, color: 'bg-purple-500' },
              { label: 'Pagado', value: data?.conversionFunnel.ordersPaid || 0, color: 'bg-green-500' },
            ].map((step, i) => {
              const prevValue = i === 0 ? step.value : [data?.conversionFunnel.pageViews, data?.conversionFunnel.addToCart, data?.conversionFunnel.checkoutStarted, data?.conversionFunnel.ordersPaid][i - 1] || 0;
              const rate = prevValue > 0 ? ((step.value / prevValue) * 100).toFixed(1) : '0';
              const maxVal = data?.conversionFunnel.pageViews || 1;
              return (
                <div key={step.label} className="text-center">
                  <div className={`w-full ${step.color} rounded-t mx-auto transition-all`} style={{ height: `${Math.max((step.value / maxVal) * 80, 8)}px` }} />
                  <div className="mt-2 text-lg font-bold text-gray-900">{step.value.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">{step.label}</div>
                  {i > 0 && <div className="text-xs text-gray-400 mt-1">{rate}%</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Events */}
      {((dateRange === '1d' ? data?.todayEvents : data?.events) || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-gray-400" />
            Eventos {dateRange === '1d' ? 'de Hoy' : `(${dateRange})`}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {(dateRange === '1d' ? data?.todayEvents : data?.events)?.map((ev) => (
              <div key={ev.event_name} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900">{ev.count}</div>
                <div className="text-xs text-gray-500 truncate" title={ev.event_name}>{ev.event_name.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources and Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            Origen de Visitas
          </h3>
          <div className="space-y-3">
            {data?.visitsByReferrer.length === 0 && <p className="text-gray-500 text-sm">Sin datos disponibles</p>}
            {data?.visitsByReferrer.map((ref, i) => (
              <div key={ref.referrer_domain} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">{i + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{ref.referrer_domain}</span>
                    <span className="text-sm text-gray-500">{ref.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${(ref.count / (data?.visitsByReferrer[0]?.count || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            Páginas más Visitadas
          </h3>
          <div className="space-y-3">
            {data?.visitsByPage.length === 0 && <p className="text-gray-500 text-sm">Sin datos disponibles</p>}
            {data?.visitsByPage.map((page, i) => (
              <div key={page.page_path} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{page.page_path}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400" title="Duración promedio">{formatDuration(page.avg_duration)}</span>
                      <span className="text-xs text-red-400" title="Tasa de rebote">{page.bounce_rate.toFixed(0)}%</span>
                      <span className="text-sm text-gray-500 font-medium">{page.count}</span>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(page.count / (data?.visitsByPage[0]?.count || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Devices, Browsers, OS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-gray-400" />
            Dispositivos
          </h3>
          <div className="space-y-3">
            {data?.visitsByDevice.map((device) => (
              <div key={device.device_type} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">{getDeviceIcon(device.device_type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 capitalize">{device.device_type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{device.count}</span>
                      <span className="text-sm text-gray-500 font-medium">{((device.count / (data?.totalVisits || 1)) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(device.count / (data?.totalVisits || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            Navegadores
          </h3>
          <div className="space-y-3">
            {data?.visitsByBrowser.map((browser) => (
              <div key={browser.browser} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{browser.browser}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{browser.count}</span>
                      <span className="text-sm text-gray-500 font-medium">{((browser.count / (data?.totalVisits || 1)) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(browser.count / (data?.totalVisits || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-gray-400" />
            Sistema Operativo
          </h3>
          <div className="space-y-3">
            {data?.visitsByOS.map((osItem) => (
              <div key={osItem.os} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{osItem.os}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{osItem.count}</span>
                      <span className="text-sm text-gray-500 font-medium">{((osItem.count / (data?.totalVisits || 1)) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(osItem.count / (data?.totalVisits || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New vs Returning */}
      {data && (data.newVisitors > 0 || data.returningVisitors > 0) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            Visitantes Nuevos vs Recurrentes
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm text-gray-700">Nuevos</span>
                </div>
                <span className="text-sm font-medium">{data.newVisitors} ({data.uniqueVisitors > 0 ? ((data.newVisitors / data.uniqueVisitors) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-700">Recurrentes</span>
                </div>
                <span className="text-sm font-medium">{data.returningVisitors} ({data.uniqueVisitors > 0 ? ((data.returningVisitors / data.uniqueVisitors) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div className="mt-3 h-3 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${data.uniqueVisitors > 0 ? (data.newVisitors / data.uniqueVisitors) * 100 : 50}%` }} />
                <div className="h-full bg-green-500 transition-all" style={{ width: `${data.uniqueVisitors > 0 ? (data.returningVisitors / data.uniqueVisitors) * 100 : 50}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color, isText = false, trend }: { 
  title: string; value: number | string; subtitle?: string; icon: React.ReactNode; 
  color: 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'cyan' | 'indigo';
  isText?: boolean; trend?: number | null;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600', amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600', cyan: 'bg-cyan-50 text-cyan-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">{title}</p>
          <p className="text-xl font-bold text-gray-900">{isText ? value : typeof value === 'number' ? value.toLocaleString() : value}</p>
          {trend !== undefined && trend !== null && (
            <div className={`flex items-center gap-0.5 text-[10px] ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
          {subtitle && <p className="text-[10px] text-gray-400 truncate">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
