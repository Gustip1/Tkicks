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

interface AdminBidRow {
  id: string;
  amount: number;
  created_at: string;
  contact: ContactInfo | null;
}

interface RecentBidRow {
  id: string;
  auction_id: string;
  amount: number;
  created_at: string;
  bidder_first_name: string | null;
  bidder_last_name: string | null;
  bidder_phone: string | null;
  auction_status: string | null;
  product_title: string | null;
  variant_size: string | null;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'recién';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

export default function AdminSubastasPage() {
  const [rows, setRows] = useState<AdminAuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [bidsModal, setBidsModal] = useState<AdminAuctionRow | null>(null);
  const [bidsList, setBidsList] = useState<AdminBidRow[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [bidBusy, setBidBusy] = useState<string | null>(null);
  const [bidsErr, setBidsErr] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentBidRow[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const loadRecent = async () => {
    setRecentLoading(true);
    try {
      const res = await fetch('/api/admin/bids/recent', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setRecent(data.bids || []);
    } catch {
      /* noop */
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    loadRecent();
    const i = setInterval(loadRecent, 15_000);
    return () => clearInterval(i);
  }, []);

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
    if (!confirm('¿Eliminar la subasta? Esto BORRA la subasta y todas sus pujas. El stock vuelve al producto.')) return;
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

  const extendTime = async (a: AdminAuctionRow) => {
    const choice = prompt(
      `Extender/modificar el tiempo de "${a.product?.title || 'la subasta'}".\n\n` +
        `Termina actualmente: ${new Date(a.end_at).toLocaleString('es-AR')}\n\n` +
        `Opción 1: escribí horas a sumar (ej: 24, -6 para restar)\n` +
        `Opción 2: escribí una fecha ISO completa (ej: 2026-05-15T20:00:00)`,
      '24'
    );
    if (choice === null) return;
    const trimmed = choice.trim();
    if (!trimmed) return;

    const body: { addHours?: number; newEndAt?: string } = {};
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber) && !trimmed.includes('-') && !trimmed.includes(':') && !trimmed.includes('T')) {
      body.addHours = asNumber;
    } else if (Number.isFinite(asNumber) && trimmed.match(/^-?\d+(\.\d+)?$/)) {
      body.addHours = asNumber;
    } else {
      body.newEndAt = trimmed;
    }

    setBusy(a.id);
    try {
      const res = await fetch(`/api/admin/auctions/${a.id}/extend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const finalizeNow = async (a: AdminAuctionRow) => {
    if (a.bid_count === 0) {
      alert('No hay pujas. Usá "Eliminar" en lugar de finalizar.');
      return;
    }
    if (
      !confirm(
        `¿Finalizar la subasta "${a.product?.title || ''}" AHORA?\n\n` +
          `Se va a marcar como Finalizada con la puja más alta (${formatARS(Number(a.current_price))}) como ganadora.`
      )
    )
      return;
    setBusy(a.id);
    try {
      const res = await fetch(`/api/admin/auctions/${a.id}/finalize`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      const w = data.winner;
      const winnerName = [w?.first_name, w?.last_name].filter(Boolean).join(' ') || '—';
      alert(`✓ Subasta finalizada.\nGanador: ${winnerName}\nTel: ${w?.phone || '—'}\nMonto: ${formatARS(Number(w?.amount || 0))}`);
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

  const openBidsModal = async (a: AdminAuctionRow) => {
    setBidsModal(a);
    setBidsList([]);
    setBidsErr(null);
    setBidsLoading(true);
    try {
      const res = await fetch(`/api/admin/auctions/${a.id}/bids`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      setBidsList(data.bids || []);
    } catch (e: any) {
      setBidsErr(e.message);
    } finally {
      setBidsLoading(false);
    }
  };

  const closeBidsModal = () => {
    setBidsModal(null);
    setBidsList([]);
    setBidsErr(null);
  };

  const deleteBid = async (bid: AdminBidRow) => {
    if (!bidsModal) return;
    const name = formatContact(bid.contact).name;
    if (
      !confirm(
        `¿Eliminar la puja de ${name} por ${formatARS(bid.amount)}?\n\nEl precio actual va a volver a la siguiente puja más alta (o al precio de salida si no quedan pujas).`
      )
    )
      return;
    setBidBusy(bid.id);
    try {
      const res = await fetch(`/api/admin/auctions/${bidsModal.id}/bids/${bid.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      // recargar listado de pujas y la lista principal de subastas
      await Promise.all([openBidsModal(bidsModal), load()]);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBidBusy(null);
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

      {/* Pujas recientes — feed global, ordenado por fecha desc */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Pujas recientes</h2>
            <p className="text-xs text-gray-500">Últimas pujas de todas las subastas. Auto-refresh cada 15s.</p>
          </div>
          <button
            onClick={loadRecent}
            disabled={recentLoading}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            {recentLoading ? '…' : 'Refrescar'}
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            Todavía no hubo pujas.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
            {recent.map((r) => {
              const name = [r.bidder_first_name, r.bidder_last_name].filter(Boolean).join(' ').trim() || 'Anónimo';
              return (
                <li key={r.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                      <a
                        href={r.bidder_phone ? `tel:${r.bidder_phone}` : '#'}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {r.bidder_phone || '—'}
                      </a>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {r.product_title || '—'}
                      {r.variant_size && <span className="text-gray-400"> · Talle {r.variant_size}</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(r.created_at)} · {new Date(r.created_at).toLocaleString('es-AR')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{formatARS(Number(r.amount))}</p>
                    <Link
                      href={`/admin/subastas`}
                      onClick={(e) => {
                        e.preventDefault();
                        const auction = rows.find((a) => a.id === r.auction_id);
                        if (auction) openBidsModal(auction);
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800"
                    >
                      Ver subasta
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

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
                    <div className="flex items-center justify-end gap-3 flex-wrap">
                      {a.bid_count > 0 && (
                        <button
                          onClick={() => openBidsModal(a)}
                          className="text-gray-700 hover:text-black font-medium text-sm"
                          title="Ver y editar pujas"
                        >
                          Ver pujas ({a.bid_count})
                        </button>
                      )}
                      {(a.status === 'active' || a.status === 'ended') && (
                        <button
                          onClick={() => resetPrice(a)}
                          disabled={busy === a.id}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:opacity-50"
                          title="Reiniciar precio y borrar pujas"
                        >
                          {busy === a.id ? '…' : 'Reiniciar precio'}
                        </button>
                      )}
                      {a.status === 'active' && (
                        <button
                          onClick={() => extendTime(a)}
                          disabled={busy === a.id}
                          className="text-purple-600 hover:text-purple-800 font-medium text-sm disabled:opacity-50"
                          title="Extender o modificar el end_at"
                        >
                          {busy === a.id ? '…' : 'Modificar tiempo'}
                        </button>
                      )}
                      {a.status === 'active' && a.bid_count > 0 && (
                        <button
                          onClick={() => finalizeNow(a)}
                          disabled={busy === a.id}
                          className="text-green-600 hover:text-green-800 font-medium text-sm disabled:opacity-50"
                          title="Cerrar la subasta ahora con el top bidder como ganador"
                        >
                          {busy === a.id ? '…' : 'Finalizar ahora'}
                        </button>
                      )}
                      {(a.status === 'active' || a.status === 'ended') && (
                        <button
                          onClick={() => cancel(a.id)}
                          disabled={busy === a.id}
                          className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                        >
                          {busy === a.id ? '…' : 'Eliminar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-500">Auto-refresh cada 30s · Tick: {tick}</div>

      {/* Modal de pujas */}
      {bidsModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={closeBidsModal}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-200">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                  Pujas
                </p>
                <h3 className="font-bold text-gray-900 truncate">
                  {bidsModal.product?.title || 'Subasta'} · Talle {bidsModal.variant?.size || '—'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Precio actual: <span className="font-semibold text-gray-800">{formatARS(Number(bidsModal.current_price))}</span>
                  {' · '}
                  Salida: {formatARS(Number(bidsModal.starting_price))}
                </p>
              </div>
              <button
                onClick={closeBidsModal}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold transition-colors shrink-0"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {bidsLoading ? (
                <div className="p-8 text-center text-sm text-gray-500">Cargando pujas…</div>
              ) : bidsErr ? (
                <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-200">{bidsErr}</div>
              ) : bidsList.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No hay pujas para esta subasta.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {bidsList.map((b, i) => {
                    const c = formatContact(b.contact);
                    const isTop = i === 0;
                    return (
                      <li key={b.id} className="p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900">{c.name}</p>
                            {isTop && (
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                                Top bidder
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{c.phone}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(b.created_at).toLocaleString('es-AR')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-gray-900 leading-none">
                            {formatARS(Number(b.amount))}
                          </p>
                          <button
                            onClick={() => deleteBid(b)}
                            disabled={bidBusy === b.id}
                            className="mt-2 text-xs text-red-600 hover:text-red-800 font-semibold disabled:opacity-50"
                          >
                            {bidBusy === b.id ? 'Eliminando…' : 'Eliminar'}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Al eliminar una puja, el precio actual vuelve a la siguiente más alta. Si no quedan pujas, se restaura al precio de salida.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
