"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatARS } from '@/lib/utils';

interface ContactInfo {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface AdminAuctionRow {
  id: string;
  status: 'active' | 'ended' | 'cancelled' | 'paid';
  starting_price: number;
  current_price: number;
  min_increment: number;
  start_at: string;
  end_at: string;
  winner_user_id: string | null;
  winner_order_id: string | null;
  created_at: string;
  bid_count: number;
  product: { id: string; title: string; slug: string; images: any } | null;
  variant: { id: string; size: string } | null;
  top_bidder_user_id?: string | null;
  winner_contact?: ContactInfo | null;
  top_bidder_contact?: ContactInfo | null;
}

function formatContact(c?: ContactInfo | null): { name: string; phone: string } {
  if (!c) return { name: '—', phone: '—' };
  const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || '—';
  return { name, phone: c.phone || '—' };
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Activa',    cls: 'bg-green-100 text-green-800' },
  ended:     { label: 'Finalizada', cls: 'bg-amber-100 text-amber-800' },
  paid:      { label: 'Pagada',    cls: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Cancelada', cls: 'bg-gray-100 text-gray-700' },
};

function formatRemaining(endAt: string): string {
  const ms = new Date(endAt).getTime() - Date.now();
  if (ms <= 0) return 'Vencida';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AdminSubastasPage() {
  const [rows, setRows] = useState<AdminAuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/auctions', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      setRows(data.auctions || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id: string) => {
    if (!confirm('¿Cancelar la subasta? El stock vuelve al producto.')) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/auctions/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  const resetPrice = async (a: AdminAuctionRow) => {
    const newPriceRaw = prompt(
      `Nuevo precio de salida para "${a.product?.title || 'la subasta'}" (en ARS).\nEsto BORRA todas las pujas existentes (${a.bid_count}) y reinicia la subasta desde 0.`,
      String(Number(a.starting_price) || 0)
    );
    if (newPriceRaw === null) return;
    const newPrice = Number(newPriceRaw);
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      alert('Precio inválido');
      return;
    }
    const newIncRaw = prompt(
      `Incremento mínimo (dejá vacío para mantener ${formatARS(Number(a.min_increment))}).`,
      ''
    );
    if (newIncRaw === null) return;
    const newInc = newIncRaw.trim() === '' ? null : Number(newIncRaw);
    if (newInc !== null && (!Number.isFinite(newInc) || newInc <= 0)) {
      alert('Incremento inválido');
      return;
    }
    if (
      !confirm(
        `¿Confirmás reiniciar la subasta?\n\nPrecio: ${formatARS(newPrice)}\n${
          newInc !== null ? `Incremento: ${formatARS(newInc)}` : 'Incremento: sin cambios'
        }\n\nSe van a borrar las ${a.bid_count} pujas actuales.`
      )
    )
      return;
    setBusy(a.id);
    try {
      const res = await fetch(`/api/admin/auctions/${a.id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStartingPrice: newPrice,
          newMinIncrement: newInc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 text-black">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Subastas</h1>
          <p className="text-sm text-gray-500">Listado y gestión. Precios en ARS.</p>
        </div>
        <Link
          href="/admin/subastas/nueva"
          className="w-full sm:w-auto text-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors active:scale-95"
        >
          + Nueva subasta
        </Link>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Producto</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Talle</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Salida</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Actual</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Pujas</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Contacto</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Termina</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500">Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500">No hay subastas todavía.</td></tr>
              ) : rows.map((a) => {
                const contactSource =
                  a.status === 'ended' || a.status === 'paid' ? a.winner_contact : a.top_bidder_contact;
                const contact = formatContact(contactSource || null);
                const contactLabel =
                  a.status === 'ended' || a.status === 'paid' ? 'Ganador' : 'Top bidder';
                return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{a.product?.title || '—'}</td>
                  <td className="px-4 py-3">{a.variant?.size || '—'}</td>
                  <td className="px-4 py-3">{formatARS(Number(a.starting_price))}</td>
                  <td className="px-4 py-3 font-semibold">{formatARS(Number(a.current_price))}</td>
                  <td className="px-4 py-3">{a.bid_count}</td>
                  <td className="px-4 py-3 text-xs">
                    {contactSource ? (
                      <div>
                        <p className="font-semibold text-gray-800">{contact.name}</p>
                        <p className="text-gray-500">{contact.phone}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{contactLabel}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {a.status === 'active' ? formatRemaining(a.end_at) : new Date(a.end_at).toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABEL[a.status]?.cls || ''}`}>
                      {STATUS_LABEL[a.status]?.label || a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(a.status === 'active' || a.status === 'ended') && (
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => resetPrice(a)}
                          disabled={busy === a.id}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:opacity-50"
                          title="Reiniciar precio y borrar pujas"
                        >
                          {busy === a.id ? '…' : 'Reiniciar precio'}
                        </button>
                        {a.status === 'active' && (
                          <button
                            onClick={() => cancel(a.id)}
                            disabled={busy === a.id}
                            className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                          >
                            {busy === a.id ? '…' : 'Cancelar'}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-500">Auto-refresh cada 30s · Tick: {tick}</div>
    </div>
  );
}
