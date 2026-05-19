"use client";
import { useCallback, useEffect, useState } from 'react';
import { FileText, CreditCard, Banknote, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

type Titular = 'standard' | 'card';

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
  orders?: { order_number: string; contact_name: string } | null;
}

const CBTE_LABELS: Record<number, string> = { 1: 'Factura A', 6: 'Factura B', 11: 'Factura C' };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

export default function FacturasPage() {
  const [tab, setTab] = useState<'all' | Titular>('all');
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = tab !== 'all' ? `?titular=${tab}` : '';
    const res = await fetch(`/api/admin/facturas${qs}`);
    const json = await res.json();
    if (!res.ok) { setError(json.error); setLoading(false); return; }
    setFacturas(json.facturas ?? []);
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // ── Totales por titular ────────────────────────────────────────────────────
  const totalStandard = facturas.filter(f => f.titular_emisor === 'standard').reduce((s, f) => s + f.imp_total, 0);
  const totalCard = facturas.filter(f => f.titular_emisor === 'card').reduce((s, f) => s + f.imp_total, 0);
  const displayed = tab === 'all' ? facturas : facturas.filter(f => f.titular_emisor === tab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Facturación Electrónica
        </h1>
        <button onClick={load} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* ── Resumen de ingresos por titular ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase">
            <Banknote className="w-4 h-4 text-emerald-400" />
            Titular Principal (Efectivo / Transferencia)
          </div>
          <p className="text-xl font-black text-white">{formatARS(totalStandard)}</p>
          <p className="text-xs text-gray-500">{facturas.filter(f => f.titular_emisor === 'standard').length} comprobantes</p>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase">
            <CreditCard className="w-4 h-4 text-purple-400" />
            Titular Tarjeta de Crédito
          </div>
          <p className="text-xl font-black text-white">{formatARS(totalCard)}</p>
          <p className="text-xs text-gray-500">{facturas.filter(f => f.titular_emisor === 'card').length} comprobantes</p>
        </div>
      </div>

      {/* ── Pestañas ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 w-fit border border-zinc-800">
        {(['all', 'standard', 'card'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-black transition-colors ${
              tab === t ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'all' ? 'Todas' : t === 'standard' ? 'Efectivo / Transf.' : 'Tarjeta'}
          </button>
        ))}
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 font-bold">{error}</p>
        </div>
      )}

      {/* ── Tabla ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs text-gray-400 font-black uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Comprobante</th>
              <th className="px-4 py-3 text-left">Titular</th>
              <th className="px-4 py-3 text-left">Orden</th>
              <th className="px-4 py-3 text-left">CAE</th>
              <th className="px-4 py-3 text-left">Vto. CAE</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 font-bold">Cargando...</td>
              </tr>
            )}
            {!loading && displayed.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 font-bold">
                  No hay facturas en este segmento.
                </td>
              </tr>
            )}
            {displayed.map((f) => (
              <tr key={f.id} className="bg-zinc-950 hover:bg-zinc-900 transition-colors">
                <td className="px-4 py-3 font-bold text-white">
                  {CBTE_LABELS[f.cbte_tipo] ?? `Tipo ${f.cbte_tipo}`} #{String(f.cbte_nro).padStart(8, '0')}
                  <span className="ml-2 text-xs text-gray-500">PV {f.pto_vta}</span>
                </td>
                <td className="px-4 py-3">
                  {f.titular_emisor === 'standard' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase border border-emerald-500/30">
                      <Banknote className="w-3 h-3" /> Principal
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-[10px] font-black uppercase border border-purple-500/30">
                      <CreditCard className="w-3 h-3" /> Tarjeta
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-300 font-bold text-xs">
                  {f.orders?.order_number ?? f.order_id.slice(0, 8)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-green-400 font-mono text-xs">
                    <CheckCircle className="w-3 h-3 shrink-0" />
                    {f.cae}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 font-bold">{f.cae_vto}</td>
                <td className="px-4 py-3 text-right font-black text-white">{formatARS(f.imp_total)}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{formatDate(f.fecha_emision)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
