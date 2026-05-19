"use client";
import { useCallback, useEffect, useState } from 'react';
import {
  FileText, CreditCard, Banknote, RefreshCw, AlertCircle,
  CheckCircle, Plus, X, ChevronRight, Loader2,
} from 'lucide-react';

type Titular = 'standard' | 'card';
type Tab = 'nueva' | 'historial';

interface Order {
  id: string;
  order_number: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  total: number;
  subtotal: number;
  payment_method: string | null;
  fulfillment: string;
  status: string;
  created_at: string;
}

interface Factura {
  id: string;
  order_id: string;
  titular_emisor: Titular;
  payment_method: string;
  cbte_tipo: number;
  pto_vta: number;
  cbte_nro: number;
  cae: string;
  cae_vto: string;
  imp_total: number;
  doc_tipo: number;
  doc_nro: number;
  descripcion: string | null;
  fecha_emision: string;
  orders?: { order_number: string; first_name: string; last_name: string } | null;
}

const CBTE_LABELS: Record<number, string> = { 1: 'Factura A', 6: 'Factura B', 11: 'Factura C' };
const PM_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  crypto_transfer: 'Transferencia',
  installments_3: 'Tarjeta 3 cuotas',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

// ─── Formulario para emitir factura ──────────────────────────────────────────
function EmitirFacturaModal({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const esCC = order.payment_method === 'installments_3';
  const [cbteTipo, setCbteTipo] = useState<11 | 6 | 1>(11);
  const [docTipo, setDocTipo] = useState<80 | 96 | 99>(99);
  const [docNro, setDocNro] = useState(order.document ?? '');
  const [impTotal, setImpTotal] = useState(String(order.total ?? order.subtotal ?? 0));
  const [descripcion, setDescripcion] = useState('Venta de indumentaria y calzado deportivo');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caeOk, setCaeOk] = useState<string | null>(null);

  const titular: Titular = esCC ? 'card' : 'standard';

  const handleEmitir = async () => {
    setError(null);
    setSubmitting(true);
    const ptoVta = Number(process.env.NEXT_PUBLIC_ARCA_PTO_VTA ?? 1);
    const res = await fetch('/api/admin/facturas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id:       order.id,
        payment_method: order.payment_method ?? 'crypto_transfer',
        pto_vta:        ptoVta || 1,
        cbte_tipo:      cbteTipo,
        concepto:       1,
        imp_total:      Number(impTotal),
        doc_tipo:       docTipo,
        doc_nro:        docTipo === 99 ? 0 : Number(docNro.replace(/\D/g, '')),
        descripcion,
      }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(json.error); return; }
    setCaeOk(json.cae);
  };

  if (caeOk) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-black text-gray-900">¡Factura emitida!</h2>
          <p className="text-sm text-gray-500 font-bold">CAE obtenido correctamente</p>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">CAE</p>
            <p className="text-lg font-mono font-black text-gray-900 break-all">{caeOk}</p>
          </div>
          <button
            onClick={() => { onSuccess(); onClose(); }}
            className="w-full py-3 rounded-xl bg-gray-900 text-white font-black text-sm uppercase tracking-tight hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-black text-gray-900">Emitir factura</h2>
            <p className="text-xs text-gray-500 font-bold">
              Orden {order.order_number ?? order.id.slice(0, 8)} ·{' '}
              {order.first_name} {order.last_name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Titular automático */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            esCC
              ? 'bg-purple-50 border-purple-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}>
            {esCC
              ? <CreditCard className="w-4 h-4 text-purple-600 shrink-0" />
              : <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
            }
            <div>
              <p className={`text-xs font-black uppercase tracking-wider ${esCC ? 'text-purple-700' : 'text-emerald-700'}`}>
                Emisor: {esCC ? 'Titular Tarjeta de Crédito' : 'Titular Principal'}
              </p>
              <p className="text-xs text-gray-500 font-bold">
                Método de pago: {PM_LABELS[order.payment_method ?? ''] ?? order.payment_method}
              </p>
            </div>
          </div>

          {/* Tipo de comprobante */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
              Tipo de comprobante
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([11, 6, 1] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCbteTipo(t)}
                  className={`py-2 rounded-lg border text-sm font-black transition-colors ${
                    cbteTipo === t
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {CBTE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Importe */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
              Importe total (ARS)
            </label>
            <input
              type="number"
              value={impTotal}
              onChange={(e) => setImpTotal(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* Receptor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                Tipo doc. receptor
              </label>
              <select
                value={docTipo}
                onChange={(e) => setDocTipo(Number(e.target.value) as 80 | 96 | 99)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value={99}>99 — Consumidor Final</option>
                <option value={96}>96 — DNI</option>
                <option value={80}>80 — CUIT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                Nro. documento
              </label>
              <input
                type="text"
                value={docNro}
                onChange={(e) => setDocNro(e.target.value)}
                disabled={docTipo === 99}
                placeholder={docTipo === 99 ? '—' : 'Ej: 38123456'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
              Descripción del servicio/producto
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-bold">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleEmitir}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-black text-sm uppercase tracking-tight hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Solicitando CAE a ARCA...</>
            ) : (
              <><FileText className="w-4 h-4" /> Emitir factura</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function FacturasPage() {
  const [tab, setTab] = useState<Tab>('nueva');
  const [filtroHistorial, setFiltroHistorial] = useState<'all' | Titular>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/facturas/pendientes');
    const json = await res.json();
    if (!res.ok) { setError(json.error); setLoading(false); return; }
    setOrders(json.orders ?? []);
    setLoading(false);
  }, []);

  const loadFacturas = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = filtroHistorial !== 'all' ? `?titular=${filtroHistorial}` : '';
    const res = await fetch(`/api/admin/facturas${qs}`);
    const json = await res.json();
    if (!res.ok) { setError(json.error); setLoading(false); return; }
    setFacturas(json.facturas ?? []);
    setLoading(false);
  }, [filtroHistorial]);

  useEffect(() => { tab === 'nueva' ? loadOrders() : loadFacturas(); }, [tab, loadOrders, loadFacturas]);

  const totalStandard = facturas.filter(f => f.titular_emisor === 'standard').reduce((s, f) => s + f.imp_total, 0);
  const totalCard     = facturas.filter(f => f.titular_emisor === 'card').reduce((s, f) => s + f.imp_total, 0);
  const displayedFacturas = filtroHistorial === 'all' ? facturas : facturas.filter(f => f.titular_emisor === filtroHistorial);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5" /> Facturación Electrónica
        </h1>
        <button
          onClick={() => tab === 'nueva' ? loadOrders() : loadFacturas()}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 font-bold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('nueva')}
          className={`px-5 py-2 rounded-lg text-sm font-black transition-colors ${tab === 'nueva' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span className="flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Nueva factura</span>
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`px-5 py-2 rounded-lg text-sm font-black transition-colors ${tab === 'historial' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Historial
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-bold">{error}</p>
        </div>
      )}

      {/* ── TAB: Nueva factura ── */}
      {tab === 'nueva' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 font-bold">
            Elegí una orden para facturar. El emisor (titular) se selecciona automáticamente según el método de pago.
          </p>
          {loading && (
            <div className="py-12 text-center text-gray-400 font-bold text-sm">Cargando órdenes...</div>
          )}
          {!loading && orders.length === 0 && (
            <div className="py-12 text-center text-gray-400 font-bold text-sm">
              No hay órdenes pendientes de facturar.
            </div>
          )}
          <div className="space-y-2">
            {orders.map((order) => {
              const esCC = order.payment_method === 'installments_3';
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Titular badge */}
                    <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${esCC ? 'bg-purple-100' : 'bg-emerald-100'}`}>
                      {esCC
                        ? <CreditCard className="w-4 h-4 text-purple-600" />
                        : <Banknote className="w-4 h-4 text-emerald-600" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900">
                        {order.first_name} {order.last_name}
                        <span className="ml-2 text-xs text-gray-400 font-bold">
                          #{order.order_number ?? order.id.slice(0, 8)}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 font-bold">
                        {PM_LABELS[order.payment_method ?? ''] ?? order.payment_method}
                        {' · '}
                        {formatDate(order.created_at)}
                        {' · '}
                        <span className={esCC ? 'text-purple-600' : 'text-emerald-600'}>
                          {esCC ? 'Titular tarjeta' : 'Titular principal'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <p className="text-sm font-black text-gray-900">{formatARS(order.total ?? order.subtotal)}</p>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-black uppercase tracking-tight hover:bg-gray-700 transition-colors"
                    >
                      Facturar <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: Historial ── */}
      {tab === 'historial' && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-black uppercase mb-1">
                <Banknote className="w-4 h-4" /> Titular Principal
              </div>
              <p className="text-xl font-black text-gray-900">{formatARS(totalStandard)}</p>
              <p className="text-xs text-gray-400 font-bold">{facturas.filter(f => f.titular_emisor === 'standard').length} comprobantes</p>
            </div>
            <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
              <div className="flex items-center gap-2 text-xs text-purple-600 font-black uppercase mb-1">
                <CreditCard className="w-4 h-4" /> Titular Tarjeta
              </div>
              <p className="text-xl font-black text-gray-900">{formatARS(totalCard)}</p>
              <p className="text-xs text-gray-400 font-bold">{facturas.filter(f => f.titular_emisor === 'card').length} comprobantes</p>
            </div>
          </div>

          {/* Filtro */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {(['all', 'standard', 'card'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFiltroHistorial(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-colors ${filtroHistorial === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t === 'all' ? 'Todas' : t === 'standard' ? 'Efectivo / Transf.' : 'Tarjeta'}
              </button>
            ))}
          </div>

          {/* Tabla */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[10px] text-gray-400 font-black uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Comprobante</th>
                  <th className="px-4 py-3 text-left">Titular</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">CAE</th>
                  <th className="px-4 py-3 text-left">Vto.</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-bold text-sm">Cargando...</td></tr>
                )}
                {!loading && displayedFacturas.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-bold text-sm">No hay facturas en este segmento.</td></tr>
                )}
                {displayedFacturas.map((f) => (
                  <tr key={f.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900 text-xs">
                      {CBTE_LABELS[f.cbte_tipo]} #{String(f.cbte_nro).padStart(8, '0')}
                    </td>
                    <td className="px-4 py-3">
                      {f.titular_emisor === 'standard' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">
                          <Banknote className="w-3 h-3" /> Principal
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black uppercase">
                          <CreditCard className="w-3 h-3" /> Tarjeta
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-bold">
                      {f.orders ? `${f.orders.first_name} ${f.orders.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-green-600 font-mono text-xs">
                        <CheckCircle className="w-3 h-3 shrink-0" />
                        {f.cae}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-bold">{f.cae_vto}</td>
                    <td className="px-4 py-3 text-right font-black text-gray-900 text-xs">{formatARS(f.imp_total)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(f.fecha_emision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de emisión */}
      {selectedOrder && (
        <EmitirFacturaModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSuccess={loadOrders}
        />
      )}
    </div>
  );
}
