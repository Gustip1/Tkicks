"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';

interface Order {
  id: string;
  order_number: string | null;
  status: 'draft' | 'paid' | 'fulfilled' | 'cancelled';
  fulfillment: 'pickup' | 'shipping';
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  created_at: string;
  updated_at: string;
}

const statusLabels = {
  draft: 'Borrador',
  paid: 'Pagado',
  fulfilled: 'Entregado',
  cancelled: 'Cancelado'
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  paid: 'bg-green-100 text-green-800',
  fulfilled: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800'
};

export default function AdminOrdersPage() {
  const supabase = createBrowserClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  }, [supabase, filter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (!error) {
      loadOrders();
    }
  };

  // Nota: el tracking detallado se gestiona en la página de detalle de cada pedido.

  const filteredOrders = orders.filter(order => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        order.order_number?.toLowerCase().includes(searchLower) ||
        order.email?.toLowerCase().includes(searchLower) ||
        `${order.first_name} ${order.last_name}`.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Pedidos</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="draft">Borrador</option>
            <option value="paid">Pagado</option>
            <option value="fulfilled">Entregado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Cargando pedidos...</p>
        </div>
      ) : (
        <>
          {/* Vista de tabla para desktop */}
          <div className="hidden md:block bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.order_number || `#${order.id.slice(0, 8)}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.fulfillment === 'pickup' ? '📦 Retiro' : '🚚 Envío'}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {order.first_name} {order.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{order.email}</div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/pedidos/${order.id}`}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Ver detalles
                          </Link>
                          {order.status === 'draft' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'paid')}
                              className="text-green-600 hover:text-green-900 text-xs"
                            >
                              ✓ Pagado
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredOrders.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No se encontraron pedidos.</p>
              </div>
            )}
          </div>

          {/* Vista de tarjetas para móvil */}
          <div className="md:hidden space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-500">No se encontraron pedidos</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/pedidos/${order.id}`}
                  className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-md transition-all active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {order.order_number || `#${order.id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {order.first_name} {order.last_name}
                      </div>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{order.fulfillment === 'pickup' ? '📦 Retiro' : '🚚 Envío'}</span>
                    <span>{new Date(order.created_at).toLocaleDateString('es-AR')}</span>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      ${order.total.toFixed(2)}
                    </span>
                    <span className="text-blue-600 font-medium text-sm">
                      Ver detalles →
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
