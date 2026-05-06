"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import { formatARS } from '@/lib/utils';

interface ProductRow {
  id: string;
  title: string;
  category: string;
  price: number;
  product_variants: { id: string; size: string; stock: number }[];
}

export default function NuevaSubastaPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [durationHours, setDurationHours] = useState('48');
  const [minIncrement, setMinIncrement] = useState('1000');
  const [antiSnipe, setAntiSnipe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const sb = createBrowserClient();
    sb.from('products')
      .select('id, title, category, price, product_variants(id, size, stock)')
      .eq('active', true)
      .order('title')
      .limit(500)
      .then(({ data }) => {
        const rows = (data || []) as unknown as ProductRow[];
        // sólo productos con al menos un variant con stock > 0
        const withStock = rows.filter((p) => (p.product_variants || []).some((v) => v.stock > 0));
        setProducts(withStock);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return products;
    const ql = q.trim().toLowerCase();
    return products.filter((p) => p.title.toLowerCase().includes(ql));
  }, [products, q]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId]
  );

  const availableVariants = useMemo(
    () => (selectedProduct?.product_variants || []).filter((v) => v.stock > 0),
    [selectedProduct]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!variantId) return setErr('Seleccioná un talle.');
    const sp = Number(startingPrice);
    if (!Number.isFinite(sp) || sp < 0) return setErr('Precio de salida inválido.');
    const dh = Number(durationHours);
    if (!Number.isFinite(dh) || dh <= 0) return setErr('Duración inválida.');
    const mi = Number(minIncrement);
    if (!Number.isFinite(mi) || mi <= 0) return setErr('Incremento mínimo inválido.');

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId,
          startingPrice: sp,
          durationHours: dh,
          minIncrement: mi,
          antiSnipeWindowSeconds: antiSnipe ? 120 : 0,
          antiSnipeExtendSeconds: antiSnipe ? 300 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      router.push('/admin/subastas');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6 text-black">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Nueva subasta</h1>
        <Link href="/admin/subastas" className="text-sm text-gray-600 hover:text-black">← Volver</Link>
      </div>

      <form onSubmit={submit} className="space-y-4 bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
        {/* Buscador */}
        <div>
          <label className="block text-xs font-medium mb-1">Buscar producto en stock</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Selector producto */}
        <div>
          <label className="block text-xs font-medium mb-1">Producto *</label>
          <select
            value={productId}
            onChange={(e) => { setProductId(e.target.value); setVariantId(''); }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            disabled={loading}
          >
            <option value="">{loading ? 'Cargando…' : `— Elegí un producto (${filtered.length}) —`}</option>
            {filtered.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} · {p.category} · ${Number(p.price).toFixed(0)} (USD ref)
              </option>
            ))}
          </select>
        </div>

        {/* Selector talle */}
        {selectedProduct && (
          <div>
            <label className="block text-xs font-medium mb-1">Talle / variante *</label>
            <select
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— Elegí un talle —</option>
              {availableVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.size} (stock: {v.stock})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Se reservará 1 unidad de la variante elegida.</p>
          </div>
        )}

        {/* Precio salida */}
        <div>
          <label className="block text-xs font-medium mb-1">Precio de salida (ARS) *</label>
          <input
            type="number"
            min="0"
            step="100"
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            placeholder="Ej: 80000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Tipealo en pesos (sin decimales). Sugerencia: usá tu precio de costo.</p>
        </div>

        {/* Duración */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Duración (hs) *</label>
            <input
              type="number"
              min="1"
              max="720"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Incremento mínimo (ARS) *</label>
            <input
              type="number"
              min="1"
              step="100"
              value={minIncrement}
              onChange={(e) => setMinIncrement(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Anti-snipe */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={antiSnipe}
            onChange={(e) => setAntiSnipe(e.target.checked)}
            className="rounded"
          />
          Anti-snipe: si entra una puja en los últimos 2 min, extender la subasta 5 min más.
        </label>

        {err && <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{err}</div>}

        <button
          type="submit"
          disabled={submitting || !variantId || !startingPrice}
          className="w-full rounded-lg bg-black text-white py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? 'Creando…' : 'Crear subasta'}
        </button>
      </form>
    </div>
  );
}
