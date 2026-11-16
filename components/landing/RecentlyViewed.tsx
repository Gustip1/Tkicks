"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { CARD_COLUMNS } from '@/lib/catalog';
import { Product } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useRecentStore } from '@/store/recent';

/** Con menos de esto no vale una sección: un solo producto ya lo vio recién */
const MIN = 2;

/**
 * "Vistos recientemente": quien vuelve a la web retoma donde dejó, sin buscar
 * de nuevo. Sale del propio dispositivo; a quien entra por primera vez no se
 * le muestra nada.
 */
export function RecentlyViewed({ excludeId, className = '' }: { excludeId?: string; className?: string }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const ids = useRecentStore.getState().ids.filter((id) => id !== excludeId).slice(0, 8);
    if (ids.length < MIN) return;
    let cancelled = false;
    (async () => {
      const { data } = await createBrowserClient().from('products').select(CARD_COLUMNS).in('id', ids).eq('active', true);
      if (cancelled) return;
      const byId = new Map(((data ?? []) as unknown as Product[]).map((p) => [p.id, p]));
      const list = ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
      if (list.length >= MIN) setProducts(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [excludeId]);

  if (products.length < MIN) return null;

  return (
    <section className={`step-enter ${className}`} aria-labelledby="recent-title">
      <h2 id="recent-title" className="t-section mb-4 md:mb-8">
        Vistos recientemente
      </h2>
      {/* Fila que se desliza con el dedo; en escritorio entran cuatro */}
      <ul className="-mx-[22px] flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-[22px] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:gap-5 md:px-0">
        {products.map((p) => (
          <li key={p.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[calc(25%-15px)]">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
