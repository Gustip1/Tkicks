"use client";
import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type OrderStatus = 'draft' | 'paid' | 'fulfilled' | 'cancelled';

interface LookupResult {
  order_number: string | null;
  status: OrderStatus | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  updated_at: string | null;
}

export default function TrackPage() {
  const supabase = createBrowserClient();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const { data, error: err } = await supabase.rpc('public_order_lookup', {
      p_order_number: orderNumber.trim(),
      p_email: email.trim()
    });
    if (err) {
      setError('No se pudo consultar el estado.');
    } else if (!data || (Array.isArray(data) && data.length === 0)) {
      setError('No se encontró una orden con esos datos.');
    } else {
      const row = Array.isArray(data) ? (data[0] as any) : (data as any);
      setResult({
        order_number: row.order_number ?? null,
        status: row.status ?? null,
        carrier: row.carrier ?? null,
        tracking_number: row.tracking_number ?? null,
        tracking_url: row.tracking_url ?? null,
        updated_at: row.updated_at ?? null
      });
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4">
      <h1 className="text-xl font-semibold text-white">Seguimiento de pedido</h1>
      <div className="space-y-3 rounded border border-neutral-800 bg-neutral-950 p-4">
        <div className="grid gap-2">
          <label className="text-sm text-neutral-300">Order Number</label>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="TK-202501-00001"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-neutral-300">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500"
          />
        </div>
        <button
          className="mt-2 inline-flex items-center justify-center rounded bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
          onClick={lookup}
          disabled={loading || !orderNumber || !email}
        >
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <div className="space-y-3 rounded border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-400">Order Number</div>
            <div className="text-sm text-white">{result.order_number}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-400">Estado</div>
            <div className="text-sm text-white">{result.status}</div>
          </div>
          {result.carrier && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-400">Carrier</div>
              <div className="text-sm text-white">{result.carrier}</div>
            </div>
          )}
          {result.tracking_number && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-400">Tracking Number</div>
              <div className="text-sm text-white">{result.tracking_number}</div>
            </div>
          )}
          {result.tracking_url && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-400">Tracking URL</div>
              <a className="text-sm text-blue-400 underline" href={result.tracking_url} target="_blank" rel="noreferrer">
                Seguir envío
              </a>
            </div>
          )}
          {result.updated_at && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-400">Última actualización</div>
              <div className="text-sm text-white">{new Date(result.updated_at).toLocaleString()}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


