"use client";
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  payment_status: string | null;
  payment_proof_url: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  size: string;
  quantity: number;
}

interface ShippingAddress {
  street: string | null;
  number: string | null;
  unit: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  notes: string | null;
}

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [address, setAddress] = useState<ShippingAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [validating, setValidating] = useState(false);

  const loadOrderDetails = useCallback(async () => {
    setLoading(true);

    // Load order
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!orderData) {
      router.push('/admin/pedidos');
      return;
    }

    setOrder(orderData);
    setCarrier(orderData.carrier || '');
    setTrackingNumber(orderData.tracking_number || '');
    setTrackingUrl(orderData.tracking_url || '');

    // Load order items
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', params.id);

    setItems(itemsData || []);

    // Load shipping address if needed
    if (orderData.fulfillment === 'shipping') {
      const { data: addressData } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('order_id', params.id)
        .single();

      setAddress(addressData);
    }

    setLoading(false);
  }, [params.id, router, supabase]);

  useEffect(() => {
    void loadOrderDetails();
  }, [loadOrderDetails]);

  const updateStatus = async (status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', params.id);

    if (!error) {
      loadOrderDetails();
    }
  };

  const updateTracking = async () => {
    const { error } = await supabase
      .from('orders')
      .update({
        carrier: carrier || null,
        tracking_number: trackingNumber || null,
        tracking_url: trackingUrl || null
      })
      .eq('id', params.id);

    if (!error) {
      loadOrderDetails();
      alert('Información de seguimiento actualizada');
    }
  };

  const validatePayment = async () => {
    setValidating(true);
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: 'validated' })
      .eq('id', params.id);
    setValidating(false);
    if (!error) {
      await loadOrderDetails();
      alert('Pago validado. Podés proceder con el envío.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Cargando pedido...</p>
      </div>
    );
  }

  if (!order) return null;

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    paid: 'bg-green-100 text-green-800',
    fulfilled: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    draft: 'Borrador',
    paid: 'Pagado',
    fulfilled: 'Entregado',
    cancelled: 'Cancelado'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/pedidos"
            className="text-blue-600 hover:text-blue-900"
          >
            ← Volver a pedidos
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {order.order_number || `Pedido #${order.id.slice(0, 8)}`}
          </h1>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>
            {statusLabels[order.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {order.status === 'draft' && (
            <button
              onClick={() => updateStatus('paid')}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700"
            >
              Marcar como pagado
            </button>
          )}
          {order.status === 'paid' && (
            <button
              onClick={() => updateStatus('fulfilled')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
            >
              Marcar como entregado
            </button>
          )}
          {order.payment_status !== 'validated' && (
            <button
              onClick={validatePayment}
              disabled={validating}
              className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700 disabled:opacity-60"
            >
              {validating ? 'Validando...' : 'Validar pago'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Productos</h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-500">Talle: {item.size}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ${item.price.toFixed(2)} x {item.quantity}
                    </p>
                    <p className="text-sm text-gray-500">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-lg font-semibold text-gray-900">
                  ${order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Tracking */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seguimiento</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Transportista</label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="Ej: Correo Argentino, OCA, Andreani"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Número de seguimiento</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Número de tracking"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">URL de seguimiento</label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={updateTracking}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
              >
                Actualizar seguimiento
              </button>
            </div>
          </div>
        </div>

        {/* Customer & Shipping */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cliente</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Nombre:</span>
                <span className="ml-2 text-gray-900">
                  {order.first_name} {order.last_name}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <span className="ml-2 text-gray-900">{order.email}</span>
              </div>
              {order.phone && (
                <div>
                  <span className="font-medium text-gray-700">Teléfono:</span>
                  <span className="ml-2 text-gray-900">{order.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          {order.fulfillment === 'shipping' && address && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dirección de envío</h2>
              <div className="text-sm text-gray-900">
                <p>{address.street} {address.number}</p>
                {address.unit && <p>Piso/Depto: {address.unit}</p>}
                <p>{address.city}, {address.province}</p>
                <p>CP: {address.postal_code}</p>
                {address.notes && <p className="mt-2 text-gray-600">Notas: {address.notes}</p>}
              </div>
            </div>
          )}

          {/* Order Info */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del pedido</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Modalidad:</span>
                <span className="ml-2 text-gray-900">
                  {order.fulfillment === 'pickup' ? 'Retiro en tienda' : 'Envío a domicilio'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Creado:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(order.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Actualizado:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(order.updated_at).toLocaleString()}
                </span>
              </div>
              {order.payment_proof_url && (
                <div className="mt-2">
                  <span className="font-medium text-gray-700">Comprobante:</span>
                  <div>
                    <a className="text-blue-600 underline" href={order.payment_proof_url} target="_blank" rel="noreferrer">Ver comprobante</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
