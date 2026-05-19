"use client";
import { useCallback, useEffect, useState } from 'react';
import {
  FileText, CreditCard, Banknote, RefreshCw, AlertCircle,
  CheckCircle, Plus, X, Loader2,
} from 'lucide-react';

type Titular = 'standard' | 'card';
type Tab = 'nueva' | 'historial';
type DocTipo = 80 | 96 | 99;
type CbteTipo = 1 | 6 | 11;
type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta';

interface Factura {
  id: string;
  order_id: string | null;
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
}

const CBTE_LABELS: Record<number, string> = { 1: 'Factura A', 6: 'Factura B', 11: 'Factura C' };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

// Mapeo método de pago → payment_method interno → titular
const METODO_MAP: Record<MetodoPago, { pm: string; titular: Titular; label: string }> = {
  efectivo:      { pm: 'cash',             titular: 'standard', label: 'Efectivo' },
  transferencia: { pm: 'crypto_transfer',  titular: 'standard', label: 'Transferencia' },
  tarjeta:       { pm: 'installments_3',   titular: 'card',     label: 'Tarjeta de crédito' },
};

// ─── Formulario nueva factura ─────────────────────────────────────────────────
function NuevaFacturaForm({ onSuccess }: { onSuccess: () => void }) {
  const [metodo, setMetodo]       = useState<MetodoPago>('efectivo');
  const [cbteTipo, setCbteTipo]   = useState<CbteTipo>(11);
  const [descripcion, setDescripcion] = useState('');
  const [impTotal, setImpTotal]   = useState('');
  const [docTipo, setDocTipo]     = useState<DocTipo>(99);
  const [docNro, setDocNro]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [caeOk, setCaeOk]         = useState<string | null>(null);

  const titular = METODO_MAP[metodo].titular;

  const reset = () => {
    setMetodo('efectivo'); setCbteTipo(11); setDescripcion('');
    setImpTotal(''); setDocTipo(99); setDocNro('');
    setError(null); setCaeOk(null);
  };

  const handleEmitir = async () => {
    setError(null);
    if (!descripcion.trim()) { setError('Ingresá una descripción del producto/servicio.'); return; }
    if (!impTotal || Number(impTotal) <= 0) { setError('Ingresá un importe válido.'); return; }
    if (docTipo !== 99 && !docNro.trim()) { setError('Ingresá el número de documento del receptor.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id:       null,
          payment_method: METODO_MAP[metodo].pm,
          pto_vta:        1,
          cbte_tipo:      cbteTipo,
          concepto:       1,
          imp_total:      Number(impTotal),
          doc_tipo:       docTipo,
          doc_nro:        docTipo === 99 ? 0 : Number(docNro.replace(/\D/g, '')),
          descripcion:    descripcion.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setCaeOk(json.cae);
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  if (caeOk) {
    return (
      <div className="max-w-md mx-auto text-center space-y-5 py-8">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900">¡Factura emitida!</h2>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-left space-y-1">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">CAE obtenido</p>
          <p className="text-base font-mono font-black text-gray-900 break-all">{caeOk}</p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-gray-900 text-white font-black text-sm uppercase tracking-tight hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Emitir otra factura
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-5">

      {/* Método de pago */}
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
          Método de pago <span className="text-gray-300 font-bold normal-case">(define quién emite)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(METODO_MAP) as [MetodoPago, typeof METODO_MAP[MetodoPago]][]).map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetodo(key)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-black transition-colors ${
                metodo === key
                  ? key === 'tarjeta'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {key === 'tarjeta'
                ? <CreditCard className="w-4 h-4" />
                : <Banknote className="w-4 h-4" />
              }
              {val.label}
            </button>
          ))}
        </div>
        <p className={`mt-2 text-xs font-black ${titular === 'card' ? 'text-purple-600' : 'text-emerald-600'}`}>
          {titular === 'card' ? '→ Emite: Titular Tarjeta de Crédito' : '→ Emite: Titular Principal'}
        </p>
      </div>

      {/* Tipo de comprobante */}
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
          Tipo de comprobante
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([11, 6, 1] as CbteTipo[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setCbteTipo(t)}
              className={`py-2.5 rounded-xl border-2 text-sm font-black transition-colors ${
                cbteTipo === t
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {CBTE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
          Descripción del producto / servicio *
        </label>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej: Zapatillas Nike Air Max - Talle 42"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Importe */}
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
          Importe total (ARS) *
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">$</span>
          <input
            type="number"
            value={impTotal}
            onChange={(e) => setImpTotal(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-black text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* Receptor */}
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
          Datos del receptor
        </label>
        <div className="flex gap-2 mb-2">
          {([
            { val: 99, label: 'Consumidor Final' },
            { val: 96, label: 'DNI' },
            { val: 80, label: 'CUIT' },
          ] as { val: DocTipo; label: string }[]).map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => { setDocTipo(opt.val); setDocNro(''); }}
              className={`flex-1 py-2 rounded-lg border text-xs font-black transition-colors ${
                docTipo === opt.val
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {docTipo !== 99 && (
          <input
            type="text"
            value={docNro}
            onChange={(e) => setDocNro(e.target.value)}
            placeholder={docTipo === 96 ? 'Número de DNI' : 'Número de CUIT'}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-bold">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleEmitir}
        disabled={submitting}
        className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-black text-sm uppercase tracking-tight hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Solicitando CAE a ARCA...</>
          : <><FileText className="w-4 h-4" /> Emitir factura</>
        }
      </button>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function FacturasPage() {
  const [tab, setTab]             = useState<Tab>('nueva');
  const [filtro, setFiltro]       = useState<'all' | Titular>('all');
  const [facturas, setFacturas]   = useState<Factura[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const loadFacturas = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = filtro !== 'all' ? `?titular=${filtro}` : '';
    const res = await fetch(`/api/admin/facturas${qs}`);
    const json = await res.json();
    if (!res.ok) { setError(json.error); setLoading(false); return; }
    setFacturas(json.facturas ?? []);
    setLoading(false);
  }, [filtro]);

  useEffect(() => { if (tab === 'historial') loadFacturas(); }, [tab, loadFacturas]);

  const displayed       = filtro === 'all' ? facturas : facturas.filter(f => f.titular_emisor === filtro);
  const totalStandard   = facturas.filter(f => f.titular_emisor === 'standard').reduce((s, f) => s + f.imp_total, 0);
  const totalCard       = facturas.filter(f => f.titular_emisor === 'card').reduce((s, f) => s + f.imp_total, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5" /> Facturación Electrónica
        </h1>
        {tab === 'historial' && (
          <button onClick={loadFacturas} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 font-bold transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('nueva')}
          className={`px-5 py-2 rounded-lg text-sm font-black transition-colors flex items-center gap-1.5 ${tab === 'nueva' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Plus className="w-3.5 h-3.5" /> Nueva factura
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`px-5 py-2 rounded-lg text-sm font-black transition-colors ${tab === 'historial' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Historial
        </button>
      </div>

      {/* ── Tab: Nueva factura ── */}
      {tab === 'nueva' && (
        <NuevaFacturaForm onSuccess={() => {}} />
      )}

      {/* ── Tab: Historial ── */}
      {tab === 'historial' && (
        <div className="space-y-4">
          {/* Resumen por titular */}
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

          {/* Filtros */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {(['all', 'standard', 'card'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFiltro(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-colors ${filtro === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t === 'all' ? 'Todas' : t === 'standard' ? 'Efectivo / Transf.' : 'Tarjeta'}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 font-bold">{error}</p>
            </div>
          )}

          {/* Tabla */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[10px] text-gray-400 font-black uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Comprobante</th>
                  <th className="px-4 py-3 text-left">Titular</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-left">CAE</th>
                  <th className="px-4 py-3 text-left">Vto.</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-bold">Cargando...</td></tr>
                )}
                {!loading && displayed.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-bold">No hay facturas todavía.</td></tr>
                )}
                {displayed.map((f) => (
                  <tr key={f.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900 text-xs whitespace-nowrap">
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
                    <td className="px-4 py-3 text-xs text-gray-600 font-bold max-w-[180px] truncate">
                      {f.descripcion ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-green-600 font-mono text-xs">
                        <CheckCircle className="w-3 h-3 shrink-0" />{f.cae}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-bold whitespace-nowrap">{f.cae_vto}</td>
                    <td className="px-4 py-3 text-right font-black text-gray-900 text-xs whitespace-nowrap">{formatARS(f.imp_total)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(f.fecha_emision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
