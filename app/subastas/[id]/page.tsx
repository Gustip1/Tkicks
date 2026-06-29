"use client";
import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Gavel, Clock, ArrowLeft, AlertCircle } from 'lucide-react';
import { ImageCarousel } from '@/components/pdp/ImageCarousel';
import { formatARS } from '@/lib/utils';
import { AuctionPolicyModal } from '@/components/subastas/AuctionPolicy';

interface AuctionDetail {
  id: string;
  status: 'active' | 'ended' | 'cancelled' | 'paid';
  starting_price: number;
  current_price: number;
  min_increment: number;
  start_at: string;
  end_at: string;
  winner_user_id: string | null;
  product: { id: string; title: string; slug: string; description: string | null; images: any };
  variant: { id: string; size: string };
}

interface SafeBid {
  id: string;
  alias: string;
  amount: number;
  created_at: string;
}

const CONTACT_LS_KEY = 'tkicks:bidder-contact';

function useCountdown(endAt: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const ms = new Date(endAt).getTime() - now;
  if (ms <= 0) return { ended: true, label: 'Finalizada' };
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  let label = '';
  if (d > 0) label = `${d}d ${h}h ${m}m ${s}s`;
  else if (h > 0) label = `${h}h ${m}m ${s}s`;
  else label = `${m}m ${s}s`;
  return { ended: false, label };
}

const inputCls = "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none transition-colors";

export default function AuctionDetailPage({ params }: { params: { id: string } }) {
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [bids, setBids] = useState<SafeBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [bidAmount, setBidAmount] = useState('');
  const [contactFirst, setContactFirst] = useState('');
  const [contactLast, setContactLast] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bidErr, setBidErr] = useState<string | null>(null);
  const [bidOk, setBidOk] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONTACT_LS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.firstName) setContactFirst(String(data.firstName));
        if (data.lastName) setContactLast(String(data.lastName));
        if (data.phone) setContactPhone(String(data.phone));
      }
    } catch { /* noop */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${params.id}?_=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      setAuction(data.auction);
      setBids(data.bids || []);
      setLastUpdate(new Date());
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const i = setInterval(load, 2_000);
    return () => clearInterval(i);
  }, [load]);
  useEffect(() => {
    const onFocus = () => load();
    const onVisibility = () => { if (document.visibilityState === 'visible') load(); };
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) window.location.reload(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [load]);

  const cd = useCountdown(auction?.end_at || new Date().toISOString());

  const effectiveCurrent = Math.max(
    Number(auction?.current_price || 0),
    bids[0]?.amount ? Number(bids[0].amount) : 0
  );
  const minRequired = useMemo(() => {
    if (!auction) return 0;
    const inc = Math.max(0, Number(auction.min_increment) || 0);
    return bids.length === 0 ? Number(auction.starting_price) : effectiveCurrent + inc;
  }, [auction, bids, effectiveCurrent]);

  const quickIncrements = useMemo(() => {
    if (!auction) return [] as number[];
    const inc = Math.max(1, Number(auction.min_increment) || 1);
    return inc <= 1000 ? [3000, 5000, 10000] : [inc * 3, inc * 5, inc * 10];
  }, [auction]);

  const applyQuickBid = (delta: number) => {
    setBidErr(null);
    setBidOk(null);
    const candidate = Math.max(minRequired, effectiveCurrent + delta);
    setBidAmount(String(candidate));
  };

  const submitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidErr(null);
    setBidOk(null);

    if (!acceptedPolicy) { setBidErr('Tenés que aceptar las bases y condiciones de las subastas para pujar.'); return; }

    const first = contactFirst.trim();
    const last = contactLast.trim();
    const phone = contactPhone.trim();
    if (!first || !last || !phone) { setBidErr('Completá nombre, apellido y teléfono.'); return; }

    const amount = Number(bidAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setBidErr('Ingresá un monto válido.'); return; }
    if (amount < minRequired) { setBidErr(`El mínimo es ${formatARS(minRequired)}`); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/auctions/${params.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, firstName: first, lastName: last, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        const fullMsg = data?.debug ? `${data.error || 'Error'} — ${data.debug}` : data?.error || 'Error';
        throw new Error(fullMsg);
      }
      setBidOk(`¡Puja de ${formatARS(amount)} registrada!`);
      setBidAmount('');
      try { localStorage.setItem(CONTACT_LS_KEY, JSON.stringify({ firstName: first, lastName: last, phone })); } catch { /* noop */ }
      await load();
      setTimeout(load, 500);
      setTimeout(load, 1500);
    } catch (e: any) {
      setBidErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-white p-8 text-gray-400 font-bold">Cargando…</div>;
  if (err || !auction) {
    return (
      <div className="min-h-screen bg-white p-8">
        <p className="text-red-500 font-bold">{err || 'Subasta no encontrada'}</p>
        <Link href="/subastas" className="text-orange-500 underline font-bold">Volver a subastas</Link>
      </div>
    );
  }

  const images = Array.isArray(auction.product.images)
    ? auction.product.images.map((img: any) => ({ url: img.url || img, alt: img.alt || auction.product.title }))
    : [];

  const topBidAmount = bids[0]?.amount ? Number(bids[0].amount) : 0;
  const displayedPrice = Math.max(
    Number(auction.current_price) || 0,
    topBidAmount,
    Number(auction.starting_price) || 0
  );

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/subastas" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 text-sm font-bold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a subastas
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          <div className="relative">
            <ImageCarousel images={images} />
            <div className="absolute top-3 left-3 z-10 bg-orange-500 text-white text-xs font-black px-2 py-1 rounded-md uppercase">
              Subasta
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">{auction.product.title}</h1>
              <p className="text-gray-500 text-sm mt-1">
                Talle: <span className="text-gray-900 font-bold">{auction.variant.size}</span>
              </p>
            </div>

            {bids.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-black text-lg shrink-0">★</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-orange-500 font-black leading-none">Va ganando</p>
                  <p className="text-base sm:text-lg font-black text-gray-900 truncate mt-1">{bids[0].alias}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase text-orange-500 font-bold">Con</p>
                  <p className="text-sm sm:text-base font-black text-gray-900">{formatARS(Number(bids[0].amount))}</p>
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase text-gray-400 font-bold">Puja actual</p>
                  <p className="text-4xl font-black text-gray-900">{formatARS(displayedPrice)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-gray-400 font-bold flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" /> Termina en
                  </p>
                  <p className={`text-xl font-bold ${cd.ended ? 'text-red-500' : 'text-orange-500'}`}>{cd.label}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 font-bold pt-3 border-t border-gray-200">
                <span>Salida: {formatARS(Number(auction.starting_price))}</span>
                <span>Incremento mín.: +{formatARS(Number(auction.min_increment))}</span>
                <span>Pujas: {bids.length}</span>
              </div>
              <div className="flex items-center justify-between pt-2 text-[11px] text-gray-400">
                <span>
                  {lastUpdate
                    ? `Actualizado ${lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : 'Cargando…'}
                </span>
                <button
                  type="button"
                  onClick={() => load()}
                  className="text-orange-500 hover:text-orange-600 font-bold uppercase tracking-wider"
                >
                  Refrescar
                </button>
              </div>
            </div>

            {auction.status === 'active' && !cd.ended && (
              <form onSubmit={submitBid} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
                <div>
                  <p className="text-orange-500 font-black uppercase text-xs tracking-wider">Tus datos</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Necesitamos nombre, apellido y teléfono para contactarte si ganás.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[10px] uppercase text-gray-500 font-bold">Nombre *</span>
                    <input
                      type="text"
                      autoComplete="given-name"
                      value={contactFirst}
                      onChange={(e) => setContactFirst(e.target.value)}
                      placeholder="Juan"
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase text-gray-500 font-bold">Apellido *</span>
                    <input
                      type="text"
                      autoComplete="family-name"
                      value={contactLast}
                      onChange={(e) => setContactLast(e.target.value)}
                      placeholder="Pérez"
                      className={inputCls}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[10px] uppercase text-gray-500 font-bold">Teléfono *</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+54 9 264..."
                    className={inputCls}
                  />
                </label>

                <div className="border-t border-gray-200 pt-4">
                  <label className="block">
                    <span className="text-xs uppercase text-gray-500 font-bold">
                      Tu puja (ARS) — mínimo {formatARS(minRequired)}
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={minRequired}
                      step="any"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={String(minRequired)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-lg font-bold text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none transition-colors"
                    />
                  </label>

                  {quickIncrements.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {quickIncrements.map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => applyQuickBid(delta)}
                          className="rounded-lg border border-orange-300 bg-orange-50 hover:bg-orange-100 active:scale-[0.98] text-orange-600 font-black text-xs sm:text-sm py-2.5 px-2 uppercase tracking-tight transition-all"
                        >
                          +{formatARS(delta)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Aceptación de bases y condiciones (obligatorio) */}
                <label className="flex items-start gap-2.5 cursor-pointer select-none border-t border-gray-200 pt-4">
                  <input
                    type="checkbox"
                    checked={acceptedPolicy}
                    onChange={(e) => setAcceptedPolicy(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-xs text-gray-600 leading-relaxed">
                    Acepto las{' '}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setPolicyOpen(true); }}
                      className="text-orange-500 hover:text-orange-600 font-bold underline underline-offset-2"
                    >
                      bases y condiciones
                    </button>{' '}
                    de las subastas y asumo el compromiso de compra. Sé que no pagar o cancelar implica
                    baneo permanente.
                  </span>
                </label>

                {bidErr && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {bidErr}
                  </p>
                )}
                {bidOk && <p className="text-green-600 text-sm font-bold">{bidOk}</p>}

                <button
                  type="submit"
                  disabled={submitting || !bidAmount || !acceptedPolicy}
                  className="w-full bg-orange-500 text-white font-black uppercase py-3 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Enviando…' : 'Pujar'}
                </button>
                <p className="text-xs text-gray-400">
                  Pago únicamente por transferencia bancaria. Si ganás te contactamos por WhatsApp con las instrucciones.
                </p>
              </form>
            )}

            {auction.status === 'ended' && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-gray-600 text-sm font-medium">
                Esta subasta finalizó. {bids.length > 0 ? 'Vamos a contactar al ganador por WhatsApp.' : 'No hubo pujas.'}
              </div>
            )}

            {auction.status === 'cancelled' && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-gray-500 text-sm font-medium">
                Esta subasta fue cancelada.
              </div>
            )}

            {auction.status === 'paid' && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-gray-500 text-sm font-medium">
                Esta subasta fue pagada y cerrada.
              </div>
            )}

            {auction.product.description && (
              <div className="text-sm text-gray-600 leading-relaxed pt-2 border-t border-gray-200">
                {auction.product.description}
              </div>
            )}
          </div>
        </div>

        <section className="mt-8">
          {bids.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
              <p className="text-gray-500 text-sm font-medium">Aún no hay pujas. ¡Sé el primero!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-orange-50 via-white to-white border border-orange-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-orange-500 font-black">Va ganando</p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 truncate mt-1">{bids[0].alias}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {bids.length} {bids.length === 1 ? 'puja' : 'pujas'} · última {new Date(bids[0].created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Con</p>
                  <p className="text-xl sm:text-2xl font-black text-gray-900">{formatARS(Number(bids[0].amount))}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Historial de pujas</p>
                </div>
                <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  {bids.map((b, i) => {
                    const isTop = i === 0;
                    return (
                      <li
                        key={b.id}
                        className={`px-4 py-3 flex items-center justify-between gap-3 ${isTop ? 'bg-orange-50' : ''}`}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className={`text-xs font-mono shrink-0 w-6 ${isTop ? 'text-orange-500' : 'text-gray-400'}`}>
                            #{bids.length - i}
                          </span>
                          <div className="min-w-0">
                            <p className={`font-bold truncate ${isTop ? 'text-gray-900' : 'text-gray-600'}`}>
                              {b.alias}
                              {isTop && (
                                <span className="ml-2 inline-flex px-1.5 py-0.5 rounded bg-orange-500 text-white text-[9px] font-black uppercase tracking-wider align-middle">
                                  Top
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {new Date(b.created_at).toLocaleString('es-AR', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        <p className={`font-bold shrink-0 ${isTop ? 'text-orange-500 text-lg' : 'text-gray-600 text-sm'}`}>
                          {formatARS(Number(b.amount))}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>

      <AuctionPolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} />
    </div>
  );
}
