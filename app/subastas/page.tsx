"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Gavel, Clock } from 'lucide-react';
import { formatARS } from '@/lib/utils';
import type { ActiveAuctionRow } from '@/types/db';
import { AuctionPolicyTrigger } from '@/components/subastas/AuctionPolicy';

function useCountdown(endAt: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const ms = new Date(endAt).getTime() - now;
  if (ms <= 0) return { ended: true, label: 'Finalizó' };
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  let label = '';
  if (d > 0) label = `${d}d ${h}h ${m}m`;
  else if (h > 0) label = `${h}h ${m}m ${s}s`;
  else label = `${m}m ${s}s`;
  return { ended: false, label };
}

function AuctionCard({ a }: { a: ActiveAuctionRow }) {
  const cd = useCountdown(a.end_at);
  return (
    <Link
      href={`/subastas/${a.id}`}
      className="group flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-orange-400 hover:shadow-md transition-all"
    >
      <div className="aspect-[3/4] bg-gray-50 relative">
        {a.product_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.product_image} alt={a.product_title} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Gavel className="w-12 h-12" />
          </div>
        )}
        <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-black px-2 py-1 rounded-md uppercase">
          Subasta
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2">
        <h3 className="text-gray-900 font-bold text-sm line-clamp-2">{a.product_title}</h3>
        <p className="text-gray-400 text-xs">Talle: {a.size}</p>
        <div className="flex items-end justify-between mt-1">
          <div>
            <p className="text-xs text-gray-400">Puja actual</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">{formatARS(Number(a.current_price))}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" />Termina
            </p>
            <p className={`text-sm font-bold ${cd.ended ? 'text-red-500' : 'text-orange-500'}`}>{cd.label}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 pt-1 border-t border-gray-200 mt-2">
          {a.bid_count} {a.bid_count === 1 ? 'puja' : 'pujas'} · Mínimo +{formatARS(Number(a.min_increment))}
        </p>
        {a.top_bidder_alias && (
          <p className="text-[11px] text-orange-500 font-bold truncate">
            ★ Va ganando {a.top_bidder_alias}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function SubastasPage() {
  const [items, setItems] = useState<ActiveAuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/auctions', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Error');
        if (!cancelled) setItems(data.auctions || []);
      } catch (e: any) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const i = setInterval(load, 5_000);
    return () => { cancelled = true; clearInterval(i); };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-gray-900 flex items-center gap-3">
            <Gavel className="w-8 h-8 text-orange-500" />
            Subastas
          </h1>
          <p className="text-gray-500 mt-2 text-sm font-bold">
            Pujá por kicks y streetwear. Precios en pesos argentinos. Pago únicamente por transferencia bancaria.
          </p>
        </div>

        {loading && <p className="text-gray-400 font-bold">Cargando subastas…</p>}
        {err && <p className="text-red-500 font-bold">{err}</p>}
        {!loading && !err && items.length === 0 && (
          <div className="border border-gray-200 rounded-xl p-8 text-center bg-gray-50">
            <p className="text-gray-500 font-bold">No hay subastas activas en este momento.</p>
            <Link href="/productos" className="text-orange-500 hover:underline mt-2 inline-block font-bold">Ver productos</Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {items.map((a) => <AuctionCard key={a.id} a={a} />)}
        </div>

        {/* Bases y condiciones */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400 font-medium">
            La participación en las subastas implica un compromiso de compra absoluto.{' '}
            <AuctionPolicyTrigger
              className="text-orange-500 hover:text-orange-600 font-bold underline underline-offset-2"
              label="Ver bases y condiciones"
            />
          </p>
        </div>
      </div>
    </div>
  );
}
