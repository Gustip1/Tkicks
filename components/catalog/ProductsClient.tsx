"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { ProductCard } from './ProductCard';

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function ProductsClient({ category, usdArsRate = 1 }: { category?: 'sneakers' | 'streetwear', usdArsRate?: number }) {
  const supabase = useRef(createBrowserClient());
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 350);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<{ size: string; count: number }[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const pageSize = dq ? 24 : 60;

  const title = useMemo(
    () => (category ? (category === 'sneakers' ? 'Sneakers' : 'Streetwear') : 'Productos'),
    [category]
  );

  const load = async (reset = true) => {
    setLoading(true);
    const from = reset ? 0 : (page + 1) * pageSize;
    const to = from + pageSize - 1;
    // Si hay término de búsqueda, obtener ids de productos que coinciden por talle para incluirlos en el OR
    let variantIdsForQ: string[] = [];
    if (dq) {
      const like = `%${dq}%`;
      const { data: vrows } = await supabase.current
        .from('product_variants')
        .select('product_id')
        .ilike('size', like);
      variantIdsForQ = Array.from(new Set((vrows || []).map((r: any) => r.product_id)));
    }

    let query = supabase.current
      .from('products')
      .select('*', { count: 'exact' })
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (category) query = query.eq('category', category);
    if (dq) {
      const like = `%${dq}%`;
      const orParts = [`title.ilike.${like}`, `slug.ilike.${like}`];
      if (variantIdsForQ.length > 0) {
        orParts.push(`id.in.(${variantIdsForQ.join(',')})`);
      }
      query = query.or(orParts.join(','));
    }
    // Si hay filtros de talles, obtener los product_ids que coinciden
    if (selectedSizes.length > 0) {
      const { data: pidRows } = await supabase.current
        .from('product_variants')
        .select('product_id')
        .in('size', selectedSizes);
      const ids = Array.from(new Set((pidRows || []).map((r: any) => r.product_id)));
      if (ids.length === 0) {
        setProducts([]);
        setHasMore(false);
        setLoading(false);
        return;
      }
      query = query.in('id', ids);
    }
    query = query.range(from, to);
    const { data, count } = await query;
    const list = (data || []) as unknown as Product[];
    setProducts((prev) => (reset ? list : [...prev, ...list]));
    setHasMore(((count || 0) > to + 1));
    setLoading(false);
    if (!reset) setPage((p) => p + 1);
    else setPage(0);
  };

  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get('q') || '').trim();
  useEffect(() => {
    // Sincronizar el estado local con ?q= en la URL (también al navegar entre búsquedas)
    setQ(urlQuery);
  }, [urlQuery]);

  // Cargar talles disponibles por categoría para filtros
  useEffect(() => {
    (async () => {
      // Si hay categoría, limitar; si no, usar global
      let productIds: string[] = [];
      if (category) {
        const { data: prod } = await supabase.current
          .from('products')
          .select('id')
          .eq('category', category)
          .eq('active', true)
          .limit(1000);
        productIds = (prod || []).map((p: any) => p.id);
      }
      let variantsQuery = supabase.current
        .from('product_variants')
        .select('size, product_id');
      if (productIds.length > 0) variantsQuery = variantsQuery.in('product_id', productIds);
      const { data: vars } = await variantsQuery;
      const counts = new Map<string, number>();
      (vars || []).forEach((v: any) => {
        const key = (v.size || '').toString();
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      let sizes = Array.from(counts.entries()).map(([size, count]) => ({ size, count }));
      if (category === 'sneakers') {
        // Mostrar solo talles numéricos y ordenarlos numéricamente
        const numeric = sizes.filter((s) => /^\d+(?:[.,]\d+)?$/.test(String(s.size)));
        sizes = numeric.sort(
          (a, b) =>
            parseFloat(String(a.size).replace(',', '.')) -
            parseFloat(String(b.size).replace(',', '.'))
        );
        setAvailableSizes(sizes);
      } else if (category === 'streetwear') {
        // Mostrar solo talles de texto clásicos y ordenarlos XS → XXL
        const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        const textual = sizes
          .map((s) => ({ size: String(s.size).toUpperCase(), count: s.count }))
          .filter((s) => order.includes(s.size));
        textual.sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size));
        setAvailableSizes(textual);
      } else {
        setAvailableSizes([]);
      }
      // Reiniciar selección al cambiar de categoría
      setSelectedSizes([]);
    })();
  }, [category]);

  useEffect(() => {
    // Cargar cuando cambian categoría, término de búsqueda o filtros de talles
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, dq, selectedSizes]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">{title}</h1>

      {/* Filtros por talle */}
      {availableSizes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableSizes.map(({ size, count }) => {
            const active = selectedSizes.includes(size);
            return (
              <button
                key={size}
                className={`rounded px-3 py-1 text-xs ${
                  active ? 'bg-white text-black' : 'bg-neutral-800 text-white hover:bg-neutral-700'
                }`}
                onClick={() =>
                  setSelectedSizes((prev) =>
                    prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
                  )
                }
              >
                {size} ({count})
              </button>
            );
          })}
          {selectedSizes.length > 0 && (
            <button
              className="rounded px-3 py-1 text-xs bg-red-600/20 text-red-300 hover:bg-red-600/30"
              onClick={() => setSelectedSizes([])}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {loading && products.length === 0 && (
        <p className="text-sm text-neutral-400">Cargando…</p>
      )}
      {!loading && products.length === 0 && (
        <p className="text-sm text-neutral-400">Sin resultados.</p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} usdArsRate={usdArsRate} />
        ))}
      </div>

      {hasMore && (
        <div className="pt-2">
          <button
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={loading}
            onClick={() => load(false)}
          >
            {loading ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  );
}


