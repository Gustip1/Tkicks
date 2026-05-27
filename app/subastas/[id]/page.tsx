"use client";
import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Gavel, Clock, ArrowLeft, AlertCircle } from 'lucide-react';
import { ImageCarousel } from '@/components/pdp/ImageCarousel';
import { formatARS } from '@/lib/utils';

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

  // Pre-cargar contacto desde el último uso (no es obligatorio, sólo cómodo)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONTACT_LS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.firstName) setContactFirst(String(data.firstName));
        if (data.lastName) setContactLast(String(data.lastName));
        if (data.phone) setContactPhone(String(data.phone));
      }
    } catch {
      /* noop */
    }
  }, []);

  const load = useCallback(async () => {
    try {
      // bust de cache vía querystring para evitar cualquier cache intermedio
      const res = await fetch(`/api/auctions/${params.id}?_=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      console.log(
        '[AUCTION DETAIL] load',
        'price:', data?.auction?.current_price,
        'starting:', data?.auction?.starting_price,
        'bids:', data?.bids?.length
      );
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

  useEffect(() => {
    load();
  }, [load]);

  // Refresh cada 2s SIEMPRE mientras la página está montada — desacoplado
  // del status para evitar que el polling se detenga si finalize cambia el
  // status entre dos requests y deja la pantalla congelada.
  useEffect(() => {
    const i = setInterval(load, 2_000);
    return () => clearInterval(i);
  }, [load]);

  // Refresh cuando el usuario vuelve a la pestaña / al foco / al volver con
  // back-forward cache (iOS Safari es agresivo con esto). Si vuelve desde
  // bfcache hacemos HARD reload — es la única forma 100% confiable.
  useEffect(() => {
    const onFocus = () => load();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Restaurado desde bf-cache → recarga total para garantizar data fresca
        window.location.reload();
      }
    };
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

  // Mínimo crudo: si no hay pujas, el de salida; si ya hubo, top + incremento.
  // Usamos el máximo entre auction.current_price y bids[0].amount para que
  // un eventual desync no nos deje calculando el mínimo mal.
  const effectiveCurrent = Math.max(
    Number(auction?.current_price || 0),
    bids[0]?.amount ? Number(bids[0].amount) : 0
  );
  const minRequired = useMemo(() => {
    if (!auction) return 0;
    const inc = Math.max(0, Number(auction.min_increment) || 0);
    return bids.length === 0
      ? Number(auction.starting_price)
      : effectiveCurrent + inc;
  }, [auction, bids, effectiveCurrent]);

  // Atajos: +3.000, +5.000, +10.000 (o 3x/5x/10x del incremento si es >1.000)
  const quickIncrements = useMemo(() => {
    if (!auction) return [] as number[];
    const inc = Math.max(1, Number(auction.min_increment) || 1);
    return inc <= 1000 ? [3000, 5000, 10000] : [inc * 3, inc * 5, inc * 10];
  }, [auction]);

  // Para los atajos: bid = max(minRequired, top + delta).
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

    const first = contactFirst.trim();
    const last = contactLast.trim();
    const phone = contactPhone.trim();
    if (!first || !last || !phone) {
      setBidErr('Completá nombre, apellido y teléfono.');
      return;
    }

    const amount = Number(bidAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setBidErr('Ingresá un monto válido.');
      return;
    }
    if (amount < minRequired) {
      setBidErr(`El mínimo es ${formatARS(minRequired)}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/auctions/${params.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          firstName: first,
          lastName: last,
          phone,
        }),
      });
      const data = await res.json();
      console.log('[BID POST] response', res.status, data);
      if (!res.ok) {
        const fullMsg = data?.debug ? `${data.error || 'Error'} — ${data.debug}` : data?.error || 'Error';
        throw new Error(fullMsg);
      }
      setBidOk(`¡Puja de ${formatARS(amount)} registrada!`);
      setBidAmount('');
      try {
        localStorage.setItem(
          CONTACT_LS_KEY,
          JSON.stringify({ firstName: first, lastName: last, phone })
        );
      } catch {
        /* noop */
      }
      // Sin optimistic update: dejamos que el server sea la fuente de verdad.
      // Forzamos varias recargas seguidas por si la primera no alcanza.
      await load();
      setTimeout(load, 500);
      setTimeout(load, 1500);
    } catch (e: any) {
      setBidErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black text-white p-8">Cargando…</div>;
  if (err || !auction) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <p className="text-red-400">{err || 'Subasta no encontrada'}</p>
        <Link href="/subastas" className="text-orange-400 underline">
          Volver a subastas
        </Link>
      </div>
    );
  }

  const images = Array.isArray(auction.product.images)
    ? auction.product.images.map((img: any) => ({ url: img.url || img, alt: img.alt || auction.product.title }))
    : [];

  // Precio mostrado: el máximo entre auction.current_price, la puja top y el
  // precio de salida. Esto blinda la UI contra cualquier desync entre la
  // tabla auctions y la tabla bids.
  const topBidAmount = bids[0]?.amount ? Number(bids[0].amount) : 0;
  const displayedPrice = Math.max(
    Number(auction.current_price) || 0,
    topBidAmount,
    Number(auction.starting_price) || 0
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/subastas" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver a subastas
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          {/* Imágenes — carrusel igual que producto */}
          <div className="relative">
            <ImageCarousel images={images} />
            <div className="absolute top-3 left-3 z-10 bg-orange-500 text-black text-xs font-black px-2 py-1 rounded-md uppercase">
              Subasta
            </div>
          </div>

          {/* Info y puja */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{auction.product.title}</h1>
              <p className="text-zinc-400 text-sm mt-1">
                Talle: <span className="text-white font-bold">{auction.variant.size}</span>
              </p>
            </div>

            {/* Banner del top bidder — destaca cuando hay alguien ganando */}
            {bids.length > 0 && (
              <div className="bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent border border-orange-500/40 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-black font-black text-lg shrink-0">
                  ★
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-orange-400 font-black leading-none">
                    Va ganando
                  </p>
                  <p className="text-base sm:text-lg font-black text-white truncate mt-1">
                    {bids[0].alias}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase text-orange-400 font-bold">Con</p>
                  <p className="text-sm sm:text-base font-black text-white">
                    {formatARS(Number(bids[0].amount))}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase text-zinc-500">Puja actual</p>
                  <p className="text-4xl font-black">{formatARS(displayedPrice)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-zinc-500 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" /> Termina en
                  </p>
                  <p className={`text-xl font-bold ${cd.ended ? 'text-red-400' : 'text-orange-400'}`}>{cd.label}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 pt-3 border-t border-zinc-800">
                <span>Salida: {formatARS(Number(auction.starting_price))}</span>
                <span>Incremento mín.: +{formatARS(Number(auction.min_increment))}</span>
                <span>Pujas: {bids.length}</span>
              </div>
              <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-500">
                <span>
                  {lastUpdate
                    ? `Actualizado ${lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : 'Cargando…'}
                </span>
                <button
                  type="button"
                  onClick={() => load()}
                  className="text-orange-400 hover:text-orange-300 font-bold uppercase tracking-wider"
                >
                  Refrescar
                </button>
              </div>
            </div>

            {/* Formulario de puja — sin login, contacto en cada puja */}
            {auction.status === 'active' && !cd.ended && (
              <form onSubmit={submitBid} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div>
                  <p className="text-orange-400 font-black uppercase text-xs tracking-wider">Tus datos</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Necesitamos nombre, apellido y teléfono para contactarte si ganás.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[10px] uppercase text-zinc-400 font-bold">Nombre *</span>
                    <input
                      type="text"
                      autoComplete="given-name"
                      value={contactFirst}
                      onChange={(e) => setContactFirst(e.target.value)}
                      placeholder="Juan"
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-bold text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase text-zinc-400 font-bold">Apellido *</span>
                    <input
                      type="text"
                      autoComplete="family-name"
                      value={contactLast}
                      onChange={(e) => setContactLast(e.target.value)}
                      placeholder="Pérez"
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-bold text-white"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[10px] uppercase text-zinc-400 font-bold">Teléfono *</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+54 9 264..."
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-bold text-white"
                  />
                </label>

                <div className="border-t border-zinc-800 pt-4">
                  <label className="block">
                    <span className="text-xs uppercase text-zinc-400">
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
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-3 text-lg font-bold text-white"
                    />
                  </label>

                  {quickIncrements.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {quickIncrements.map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => applyQuickBid(delta)}
                          className="rounded-lg border border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20 active:scale-[0.98] text-orange-300 font-black text-xs sm:text-sm py-2.5 px-2 uppercase tracking-tight transition-all"
                        >
                          +{formatARS(delta)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {bidErr && (
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {bidErr}
                  </p>
                )}
                {bidOk && <p className="text-green-400 text-sm">{bidOk}</p>}

                <button
                  type="submit"
                  disabled={submitting || !bidAmount}
                  className="w-full bg-orange-500 text-black font-black uppercase py-3 rounded-lg hover:bg-orange-400 disabled:opacity-50"
                >
                  {submitting ? 'Enviando…' : 'Pujar'}
                </button>
                <p className="text-xs text-zinc-500">
                  Pago únicamente por transferencia bancaria. Si ganás te contactamos por WhatsApp con las
                  instrucciones.
                </p>
              </form>
            )}

            {auction.status === 'ended' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-zinc-300 text-sm">
                Esta subasta finalizó. {bids.length > 0 ? 'Vamos a contactar al ganador por WhatsApp.' : 'No hubo pujas.'}
              </div>
            )}

            {auction.status === 'cancelled' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-zinc-400 text-sm">
                Esta subasta fue cancelada.
              </div>
            )}

            {auction.status === 'paid' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-zinc-400 text-sm">
                Esta subasta fue pagada y cerrada.
              </div>
            )}

            {/* Descripción */}
            {auction.product.description && (
              <div className="text-sm text-zinc-300 leading-relaxed pt-2 border-t border-zinc-800">
                {auction.product.description}
              </div>
            )}
          </div>
        </div>

        {/* Quién va ganando + historial de pujas */}
        <section className="mt-8">
          {bids.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
              <p className="text-zinc-400 text-sm">Aún no hay pujas. ¡Sé el primero!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Top bidder destacado */}
              <div className="bg-gradient-to-br from-orange-500/15 via-zinc-900 to-zinc-900 border border-orange-500/30 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-orange-400 font-black">
                    Va ganando
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-white truncate mt-1">
                    {bids[0].alias}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {bids.length} {bids.length === 1 ? 'puja' : 'pujas'} · última {new Date(bids[0].created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Con</p>
                  <p className="text-xl sm:text-2xl font-black text-white">
                    {formatARS(Number(bids[0].amount))}
                  </p>
                </div>
              </div>

              {/* Historial completo: todas las pujas en orden descendente */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                    Historial de pujas
                  </p>
                </div>
                <ul className="divide-y divide-zinc-800 max-h-80 overflow-y-auto">
                  {bids.map((b, i) => {
                    const isTop = i === 0;
                    return (
                      <li
                        key={b.id}
                        className={`px-4 py-3 flex items-center justify-between gap-3 ${
                          isTop ? 'bg-orange-500/5' : ''
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span
                            className={`text-xs font-mono shrink-0 w-6 ${
                              isTop ? 'text-orange-400' : 'text-zinc-500'
                            }`}
                          >
                            #{bids.length - i}
                          </span>
                          <div className="min-w-0">
                            <p
                              className={`font-bold truncate ${
                                isTop ? 'text-white' : 'text-zinc-300'
                              }`}
                            >
                              {b.alias}
                              {isTop && (
                                <span className="ml-2 inline-flex px-1.5 py-0.5 rounded bg-orange-500 text-black text-[9px] font-black uppercase tracking-wider align-middle">
                                  Top
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                              {new Date(b.created_at).toLocaleString('es-AR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`font-bold shrink-0 ${
                            isTop ? 'text-orange-400 text-lg' : 'text-zinc-300 text-sm'
                          }`}
                        >
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
    </div>
  );
}
