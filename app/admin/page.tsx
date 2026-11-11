"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import { Package, ShoppingCart, DollarSign, Users, AlertTriangle, CreditCard } from 'lucide-react';
import {
  SALE_COLUMNS,
  TONE_CLASSES,
  WebSale,
  amountLabel,
  customerName,
  markSeen,
  methodLabel,
  needsReview,
  readSeen,
  saleRef,
  saleState,
  timeAgo,
} from '@/lib/admin/webSales';

interface Stats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  revenue: number;
  monthlyRevenue: number;
  lowStockProducts: number;
  totalCustomers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<WebSale[]>([]);
  // Lo que ya habías visto antes de entrar: lo posterior se marca como nuevo
  const [seenBefore, setSeenBefore] = useState<string | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    void loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    // Products
    const { data: allProducts } = await supabase.from('products').select('id, active');
    const totalProducts = allProducts?.length || 0;
    const activeProducts = (allProducts || []).filter((p: any) => p.active).length;

    // Orders
    const { data: orders } = await supabase.from('orders').select('id, total, status, created_at');
    const totalOrders = orders?.length || 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = (orders || []).filter((o: any) => new Date(o.created_at) >= today).length;
    const pendingOrders = (orders || []).filter((o: any) => o.status === 'paid').length;
    // Ingresos: solo lo pagado o entregado (antes sumaba pedidos sin pagar y cancelados)
    const cashed = (orders || []).filter((o: any) => o.status === 'paid' || o.status === 'fulfilled');
    const revenue = cashed.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const now = new Date();
    const monthlyRevenue = cashed
      .filter((o: any) => {
        const d = new Date(o.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);

    // Customers
    const { data: customers } = await supabase.from('profiles').select('id').eq('role', 'user');
    const totalCustomers = customers?.length || 0;

    // Low stock (variants with stock <= 2)
    const { data: lowStock } = await supabase
      .from('product_variants')
      .select('id, stock')
      .lte('stock', 2);
    const lowStockProducts = lowStock?.length || 0;

    setStats({
      totalProducts,
      activeProducts,
      totalOrders,
      todayOrders,
      pendingOrders,
      revenue,
      monthlyRevenue,
      lowStockProducts,
      totalCustomers
    });

    // Ventas por la web: las últimas, con cómo pagaron y cuánto
    const { data: recent } = await supabase
      .from('orders')
      .select(SALE_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(12);
    const list = ((recent || []) as WebSale[]).filter(
      // Un cobro con tarjeta en curso (unos segundos) todavía no es una venta
      (s) => !(s.payment_method === 'card' && s.status === 'draft' && !needsReview(s))
    );
    setRecentOrders(list.slice(0, 10));
    setSeenBefore(readSeen());
    // Entrar al dashboard cuenta como haberlas visto: la campanita vuelve a cero
    if (list.length) markSeen(list[0].created_at);
  };

  return (
    <div className="space-y-6 text-black">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow-sm rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <Package className="h-6 w-6 text-gray-400" />
                  <div className="ml-4">
                    <div className="text-sm text-gray-500">Productos activos</div>
                    <div className="text-lg font-semibold">{stats.activeProducts}/{stats.totalProducts}</div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 text-sm">
                <Link href="/admin/productos" className="text-blue-600 hover:text-blue-500">Ver productos</Link>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <ShoppingCart className="h-6 w-6 text-gray-400" />
                  <div className="ml-4">
                    <div className="text-sm text-gray-500">Pedidos hoy</div>
                    <div className="text-lg font-semibold">{stats.todayOrders}</div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 text-sm">
                <Link href="/admin/pedidos" className="text-blue-600 hover:text-blue-500">Ver pedidos</Link>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <DollarSign className="h-6 w-6 text-gray-400" />
                  <div className="ml-4">
                    <div className="text-sm text-gray-500">Ingresos del mes</div>
                    <div className="text-lg font-semibold">${stats.monthlyRevenue.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 text-sm text-gray-600">
                Total histórico: ${stats.revenue.toFixed(2)}
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-gray-400" />
                  <div className="ml-4">
                    <div className="text-sm text-gray-500">Clientes</div>
                    <div className="text-lg font-semibold">{stats.totalCustomers}</div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 text-sm">
                <Link href="/admin/clientes" className="text-blue-600 hover:text-blue-500">Ver clientes</Link>
              </div>
            </div>
          </div>

          {(stats.pendingOrders > 0 || stats.lowStockProducts > 0) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {stats.pendingOrders > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="text-sm font-medium text-yellow-800">{stats.pendingOrders} pedidos pendientes de envío</div>
                      <Link href="/admin/pedidos?status=paid" className="text-sm text-yellow-800 underline">Ver pedidos →</Link>
                    </div>
                  </div>
                </div>
              )}
              {stats.lowStockProducts > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <div className="text-sm font-medium text-red-800">{stats.lowStockProducts} variantes con stock bajo</div>
                      <Link href="/admin/stock" className="text-sm text-red-800 underline">Revisar stock →</Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cobros con tarjeta que Payway no llegó a confirmar o está revisando */}
          {recentOrders.some(needsReview) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
                <div className="text-sm text-yellow-900">
                  <p className="font-medium">Pagos con tarjeta para revisar</p>
                  <p className="mt-0.5">
                    Payway no confirmó estos cobros todavía. Revisalos en su panel antes de despachar:{' '}
                    {recentOrders.filter(needsReview).map((s, i) => (
                      <span key={s.id}>
                        {i > 0 && ', '}
                        <Link href={`/admin/pedidos/${s.id}`} className="underline">
                          {saleRef(s)}
                        </Link>
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium">Ventas por la web</h2>
              <span className="text-xs text-gray-500">Las nuevas desde tu última visita están marcadas</span>
            </div>
            {recentOrders.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-500">Todavía no entró ninguna venta por la web.</p>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentOrders.map((order) => {
                  const state = saleState(order);
                  const isNew = !!seenBefore && order.created_at > seenBefore;
                  return (
                    <Link
                      key={order.id}
                      href={`/admin/pedidos/${order.id}`}
                      className={`block px-6 py-4 hover:bg-gray-50 ${isNew ? 'bg-green-50/60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {order.payment_method === 'card' && <CreditCard className="h-4 w-4 text-gray-500 shrink-0" aria-hidden />}
                            <span className="text-sm font-medium text-gray-900">{saleRef(order)}</span>
                            {isNew && (
                              <span className="rounded-full bg-green-600 px-2 py-0.5 text-[11px] font-semibold text-white">Nueva</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 truncate">
                            {customerName(order)} · {methodLabel(order)}
                          </div>
                          <div className="text-xs text-gray-400">{timeAgo(order.created_at)}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-sm font-semibold">{amountLabel(order)}</span>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${TONE_CLASSES[state.tone]}`}>
                            {state.label}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            <div className="px-6 py-3 bg-gray-50">
              <Link href="/admin/pedidos" className="text-sm text-blue-600 hover:text-blue-500">Ver todos los pedidos →</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


