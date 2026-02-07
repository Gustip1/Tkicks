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
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  totalVisits: number;
  todayVisits: number;
  uniqueVisitors: number;
  avgDuration: number;
  bounceRate: number;
  visitsByDevice: { device_type: string; count: number }[];
  visitsByBrowser: { browser: string; count: number }[];
  visitsByReferrer: { referrer_domain: string; count: number }[];
  visitsByPage: { page_path: string; count: number; avg_duration: number }[];
  visitsByHour: { hour: number; count: number }[];
  visitsByDay: { day: number; day_name: string; count: number }[];
  visitsTrend: { date: string; count: number }[];
}

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const supabase = createBrowserClient();

  const loadAnalytics = async () => {
    setLoading(true);
    
    const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    const startDateStr = startDate.toISOString();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    try {
      // Total visits en el período
      const { data: visits, count: totalVisits } = await supabase
        .from('analytics_visits')
        .select('*', { count: 'exact' })
        .gte('created_at', startDateStr);

      // Visitas de hoy
      const { count: todayVisits } = await supabase
        .from('analytics_visits')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStr);

      // Visitantes únicos
      const { data: uniqueData } = await supabase
        .from('analytics_visits')
        .select('visitor_id')
        .gte('created_at', startDateStr);
      
      const uniqueVisitors = new Set(uniqueData?.map(v => v.visitor_id)).size;

      // Calcular duración promedio y bounce rate de los datos obtenidos
      const visitsList = visits || [];
      const avgDuration = visitsList.length > 0
        ? visitsList.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) / visitsList.length
        : 0;
      
      const bounces = visitsList.filter(v => v.is_bounce).length;
      const bounceRate = visitsList.length > 0 ? (bounces / visitsList.length) * 100 : 0;

      // Visitas por dispositivo
      const deviceCounts: Record<string, number> = {};
      visitsList.forEach(v => {
        const device = v.device_type || 'unknown';
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      });
      const visitsByDevice = Object.entries(deviceCounts).map(([device_type, count]) => ({ device_type, count }));

      // Visitas por browser
      const browserCounts: Record<string, number> = {};
      visitsList.forEach(v => {
        const browser = v.browser || 'unknown';
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      });
      const visitsByBrowser = Object.entries(browserCounts)
        .map(([browser, count]) => ({ browser, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Visitas por referrer
      const referrerCounts: Record<string, number> = {};
      visitsList.forEach(v => {
        const ref = v.referrer_domain || 'Directo';
        referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
      });
      const visitsByReferrer = Object.entries(referrerCounts)
        .map(([referrer_domain, count]) => ({ referrer_domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Visitas por página
      const pageCounts: Record<string, { count: number; totalDuration: number }> = {};
      visitsList.forEach(v => {
        const page = v.page_path || '/';
        if (!pageCounts[page]) pageCounts[page] = { count: 0, totalDuration: 0 };
        pageCounts[page].count += 1;
        pageCounts[page].totalDuration += v.duration_seconds || 0;
      });
      const visitsByPage = Object.entries(pageCounts)
        .map(([page_path, data]) => ({ 
          page_path, 
          count: data.count, 
          avg_duration: data.count > 0 ? data.totalDuration / data.count : 0 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Visitas por hora
      const hourCounts: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourCounts[i] = 0;
      visitsList.forEach(v => {
        const hour = new Date(v.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const visitsByHour = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => a.hour - b.hour);

      // Visitas por día de la semana
      const dayCounts: Record<number, number> = {};
      for (let i = 0; i < 7; i++) dayCounts[i] = 0;
      visitsList.forEach(v => {
        const day = new Date(v.created_at).getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const visitsByDay = Object.entries(dayCounts)
        .map(([day, count]) => ({ day: parseInt(day), day_name: DAYS_ES[parseInt(day)], count }))
        .sort((a, b) => a.day - b.day);

      // Tendencia de visitas (últimos días)
      const dateCounts: Record<string, number> = {};
      visitsList.forEach(v => {
        const date = new Date(v.created_at).toISOString().split('T')[0];
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      });
      const visitsTrend = Object.entries(dateCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setData({
        totalVisits: totalVisits || 0,
        todayVisits: todayVisits || 0,
        uniqueVisitors,
        avgDuration,
        bounceRate,
        visitsByDevice,
        visitsByBrowser,
        visitsByReferrer,
        visitsByPage,
        visitsByHour,
        visitsByDay,
        visitsTrend,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
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

  const peakHour = useMemo(() => {
    if (!data?.visitsByHour.length) return null;
    return data.visitsByHour.reduce((max, h) => h.count > max.count ? h : max, data.visitsByHour[0]);
  }, [data?.visitsByHour]);

  const peakDay = useMemo(() => {
    if (!data?.visitsByDay.length) return null;
    return data.visitsByDay.reduce((max, d) => d.count > max.count ? d : max, data.visitsByDay[0]);
  }, [data?.visitsByDay]);

  const maxHourCount = Math.max(...(data?.visitsByHour.map(h => h.count) || [1]));
  const maxDayCount = Math.max(...(data?.visitsByDay.map(d => d.count) || [1]));

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

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
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Visitas"
          value={data?.totalVisits || 0}
          icon={<Eye className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Hoy"
          value={data?.todayVisits || 0}
          icon={<Calendar className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Visitantes Únicos"
          value={data?.uniqueVisitors || 0}
          icon={<Users className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Duración Promedio"
          value={formatDuration(data?.avgDuration || 0)}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
          isText
        />
        <StatCard
          title="Tasa de Rebote"
          value={`${(data?.bounceRate || 0).toFixed(1)}%`}
          icon={<MousePointer className="w-5 h-5" />}
          color="red"
          isText
        />
      </div>

      {/* Peak Times */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 opacity-80" />
            <span className="font-medium opacity-90">Hora Pico</span>
          </div>
          <div className="text-3xl font-bold">
            {peakHour ? `${peakHour.hour.toString().padStart(2, '0')}:00` : '--:--'}
          </div>
          <div className="text-sm opacity-80 mt-1">
            {peakHour ? `${peakHour.count} visitas` : 'Sin datos'}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 opacity-80" />
            <span className="font-medium opacity-90">Día Pico</span>
          </div>
          <div className="text-3xl font-bold">
            {peakDay?.day_name || 'Sin datos'}
          </div>
          <div className="text-sm opacity-80 mt-1">
            {peakDay ? `${peakDay.count} visitas` : 'Sin datos'}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitas por Hora */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Visitas por Hora
          </h3>
          <div className="flex items-end gap-1 h-32">
            {data?.visitsByHour.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                  style={{ height: `${(h.count / maxHourCount) * 100}%`, minHeight: h.count > 0 ? '4px' : '0' }}
                  title={`${h.hour}:00 - ${h.count} visitas`}
                />
                {h.hour % 6 === 0 && (
                  <span className="text-[10px] text-gray-400 mt-1">{h.hour}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Visitas por Día */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Visitas por Día
          </h3>
          <div className="flex items-end gap-2 h-32">
            {data?.visitsByDay.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-purple-500 rounded-t transition-all hover:bg-purple-600"
                  style={{ height: `${(d.count / maxDayCount) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                  title={`${d.day_name} - ${d.count} visitas`}
                />
                <span className="text-[10px] text-gray-400 mt-1">{d.day_name.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sources and Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Origen de Visitas */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            Origen de Visitas
          </h3>
          <div className="space-y-3">
            {data?.visitsByReferrer.length === 0 && (
              <p className="text-gray-500 text-sm">Sin datos disponibles</p>
            )}
            {data?.visitsByReferrer.map((ref, i) => (
              <div key={ref.referrer_domain} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{ref.referrer_domain}</span>
                    <span className="text-sm text-gray-500">{ref.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(ref.count / (data?.visitsByReferrer[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Páginas más Visitadas */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            Páginas más Visitadas
          </h3>
          <div className="space-y-3">
            {data?.visitsByPage.length === 0 && (
              <p className="text-gray-500 text-sm">Sin datos disponibles</p>
            )}
            {data?.visitsByPage.map((page, i) => (
              <div key={page.page_path} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{page.page_path}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">{formatDuration(page.avg_duration)}</span>
                      <span className="text-sm text-gray-500">{page.count}</span>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(page.count / (data?.visitsByPage[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Devices and Browsers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dispositivos */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-gray-400" />
            Dispositivos
          </h3>
          <div className="space-y-3">
            {data?.visitsByDevice.map((device) => (
              <div key={device.device_type} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  {getDeviceIcon(device.device_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 capitalize">{device.device_type}</span>
                    <span className="text-sm text-gray-500">
                      {((device.count / (data?.totalVisits || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${(device.count / (data?.totalVisits || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navegadores */}
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
                    <span className="text-sm text-gray-500">
                      {((browser.count / (data?.totalVisits || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${(browser.count / (data?.totalVisits || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de tarjeta de estadísticas
function StatCard({ 
  title, 
  value, 
  icon, 
  color,
  isText = false
}: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode; 
  color: 'blue' | 'green' | 'purple' | 'amber' | 'red';
  isText?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <p className="text-xl font-bold text-gray-900">
            {isText ? value : typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );
}
