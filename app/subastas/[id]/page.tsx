"use client";
import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gavel, Clock, ArrowLeft, AlertCircle } from 'lucide-react';
import { formatARS } from '@/lib/utils';
import { createBrowserClient } from '@/lib/supabase/client';

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
  const router = useRouter();
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [bids, setBids] = useState<SafeBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bidErr, setBidErr] = useState<string | null>(null);
  const [bidOk, setBidOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${params.id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      setAuction(data.auction);
      setBids(data.bids || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  // refresh cada 5s mientras está activa para reflejar pujas en vivo
  useEffect(() => {
    if (!auction || auction.status !== 'active') return;
    const i = setInterval(load, 5_000);
    return () => clearInterval(i);
  }, [auction, load]);

  // auth + perfil
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; phone: string | null } | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [contactFirst, setContactFirst] = useState('');
  const [contactLast, setContactLast] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setProfile(data.profile);
    } catch {
      /* noop */
    } finally {
      setProfileChecked(true);
    }
  }, []);

  useEffect(() => {
    const sb = createBrowserClient();
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
      if (data.user) refreshProfile();
      else setProfileChecked(true);
    });
  }, [refreshProfile]);

  useEffect(() => {
    if (profile) {
      setContactFirst(profile.first_name || '');
      setContactLast(profile.last_name || '');
      setContactPhone(profile.phone || '');
    }
  }, [profile]);

  const hasContactInfo = !!(
    profile?.first_name?.trim() &&
    profile?.last_name?.trim() &&
    profile?.phone?.trim()
  );

  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr(null);
    if (!contactFirst.trim() || !contactLast.trim() || !contactPhone.trim()) {
      setProfileErr('Completá nombre, apellido y teléfono.');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: contactFirst.trim(),
          lastName: contactLast.trim(),
          phone: contactPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      await refreshProfile();
    } catch (err: any) {
      setProfileErr(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const cd = useCountdown(auction?.end_at || new Date().toISOString());

  // Mínimo redondeado al múltiplo de min_increment más cercano hacia arriba.
  // Esto evita que aparezcan números "feos" como 81.001 cuando alguien puja
  // un peso por encima del mínimo: el siguiente requerido siempre termina en
  // un valor "limpio" (múltiplo del incremento, normalmente 1.000).
  const minRequired = useMemo(() => {
    if (!auction) return 0;
    const inc = Math.max(1, Number(auction.min_increment) || 1);
    const raw =
      bids.length === 0
        ? Number(auction.starting_price)
        : Number(auction.current_price) + inc;
    return Math.ceil(raw / inc) * inc;
  }, [auction, bids]);

  const quickIncrements = useMemo(() => {
    if (!auction) return [] as number[];
    const inc = Math.max(1, Number(auction.min_increment) || 1);
    // Tres atajos: el incremento mínimo, 5x el incremento, 10x el incremento.
    // Para incrementos típicos de 1.000 esto da +3.000 / +5.000 / +10.000.
    const base = inc <= 1000 ? [3000, 5000, 10000] : [inc * 3, inc * 5, inc * 10];
    return base;
  }, [auction]);

  const applyQuickBid = (delta: number) => {
    setBidErr(null);
    setBidOk(null);
    const inc = Math.max(1, Number(auction?.min_increment) || 1);
    const current = Number(auction?.current_price || 0);
    // "Sumar X al precio actual" pero nunca por debajo del mínimo, y
    // redondeado al múltiplo de inc más cercano hacia arriba.
    const candidate = Math.max(minRequired, current + delta);
    const rounded = Math.ceil(candidate / inc) * inc;
    setBidAmount(String(rounded));
  };

  const submitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidErr(null);
    setBidOk(null);
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
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      setBidOk('¡Puja registrada!');
      setBidAmount('');
      await load();
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
        <Link href="/subastas" className="text-orange-400 underline">Volver a subastas</Link>
      </div>
    );
  }

  const image = Array.isArray(auction.product.images) && auction.product.images[0]?.url;
  const isWinner = !!user && auction.winner_user_id === user.id;
  const showCheckout = auction.status === 'ended' && isWinner;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/subastas" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver a subastas
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          {/* Imagen */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="aspect-square bg-zinc-800 relative">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={auction.product.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <Gavel className="w-16 h-16" />
                </div>
              )}
              <div className="absolute top-3 left-3 bg-orange-500 text-black text-xs font-black px-2 py-1 rounded-md uppercase">
                Subasta
              </div>
            </div>
          </div>

          {/* Info y puja */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{auction.product.title}</h1>
              <p className="text-zinc-400 text-sm mt-1">Talle: <span className="text-white font-bold">{auction.variant.size}</span></p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase text-zinc-500">Puja actual</p>
                  <p className="text-4xl font-black">{formatARS(Number(auction.current_price))}</p>
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
            </div>

            {/* Formulario de puja */}
            {auction.status === 'active' && !cd.ended && (
              <form onSubmit={submitBid} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                {!authChecked || (user && !profileChecked) ? (
                  <p className="text-zinc-400 text-sm">Verificando sesión…</p>
                ) : !user ? (
                  <div className="text-sm text-zinc-300">
                    <p className="mb-3">Iniciá sesión para pujar.</p>
                    <Link
                      href={`/login?redirect=/subastas/${auction.id}`}
                      className="inline-block bg-orange-500 text-black font-black px-4 py-2 rounded-lg uppercase text-sm"
                    >
                      Iniciar sesión
                    </Link>
                  </div>
                ) : !hasContactInfo ? (
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <p className="text-orange-400 font-black uppercase text-xs tracking-wider">
                        Antes de pujar
                      </p>
                      <p className="text-sm text-zinc-300 mt-1">
                        Necesitamos tu nombre, apellido y teléfono para contactarte si ganás la subasta.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10px] uppercase text-zinc-400 font-bold">Nombre *</span>
                        <input
                          type="text"
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
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+54 9 264..."
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-bold text-white"
                      />
                    </label>
                    {profileErr && (
                      <p className="text-red-400 text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {profileErr}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={saveContact}
                      disabled={savingProfile}
                      className="w-full bg-orange-500 text-black font-black uppercase py-3 rounded-lg hover:bg-orange-400 disabled:opacity-50"
                    >
                      {savingProfile ? 'Guardando…' : 'Guardar y habilitar puja'}
                    </button>
                    <p className="text-[11px] text-zinc-500">
                      Estos datos se guardan una sola vez. Sólo el admin de Tkicks va a verlos.
                    </p>
                  </div>
                ) : (
                  <>
                    <label className="block">
                      <span className="text-xs uppercase text-zinc-400">Tu puja (ARS) — mínimo {formatARS(minRequired)}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={minRequired}
                        step={Math.max(1, Number(auction.min_increment) || 1000)}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={String(minRequired)}
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-3 text-lg font-bold text-white"
                      />
                    </label>

                    {/* Atajos de puja rápida */}
                    {quickIncrements.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
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

                    {bidErr && <p className="text-red-400 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {bidErr}</p>}
                    {bidOk && <p className="text-green-400 text-sm">{bidOk}</p>}
                    <button
                      type="submit"
                      disabled={submitting || !bidAmount}
                      className="w-full bg-orange-500 text-black font-black uppercase py-3 rounded-lg hover:bg-orange-400 disabled:opacity-50"
                    >
                      {submitting ? 'Enviando…' : 'Pujar'}
                    </button>
                    <p className="text-xs text-zinc-500">
                      Pago únicamente por transferencia bancaria. Si ganás vas a recibir las instrucciones para pagar.
                    </p>
                  </>
                )}
              </form>
            )}

            {auction.status === 'ended' && !isWinner && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-zinc-300 text-sm">
                Esta subasta finalizó. {auction.winner_user_id ? 'Hay ganador.' : 'No hubo pujas.'}
              </div>
            )}

            {showCheckout && (
              <div className="bg-green-900/30 border border-green-700 rounded-2xl p-5 space-y-3">
                <p className="font-bold text-green-300">¡Ganaste la subasta!</p>
                <p className="text-sm text-zinc-300">Total a transferir: <span className="font-black text-white">{formatARS(Number(auction.current_price))}</span></p>
                <button
                  onClick={() => router.push(`/subastas/${auction.id}/pagar`)}
                  className="w-full bg-orange-500 text-black font-black uppercase py-3 rounded-lg hover:bg-orange-400"
                >
                  Continuar al pago
                </button>
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

        {/* Historial de pujas */}
        <section className="mt-10">
          <h2 className="text-xl font-black uppercase mb-4">Historial de pujas</h2>
          {bids.length === 0 ? (
            <p className="text-zinc-500 text-sm">Aún no hay pujas. ¡Sé el primero!</p>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-bold text-zinc-400 uppercase text-xs">Pujador</th>
                    <th className="text-right px-4 py-2 font-bold text-zinc-400 uppercase text-xs">Monto</th>
                    <th className="text-right px-4 py-2 font-bold text-zinc-400 uppercase text-xs">Cuándo</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((b, i) => (
                    <tr key={b.id} className="border-t border-zinc-800">
                      <td className="px-4 py-2">
                        {b.alias}{i === 0 && <span className="ml-2 text-xs text-orange-400">★ Top</span>}
                      </td>
                      <td className="px-4 py-2 text-right font-bold">{formatARS(Number(b.amount))}</td>
                      <td className="px-4 py-2 text-right text-zinc-500 text-xs">
                        {new Date(b.created_at).toLocaleString('es-AR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
