"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { CARD_COLUMNS } from '@/lib/catalog';
import { Product } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ProductGridSkeleton } from '@/components/catalog/ProductsClient';
import { useFavoritesStore } from '@/store/favorites';

/** Los productos guardados con el corazón, en este dispositivo */
export function FavoritosClient() {
  const ids = useFavoritesStore((s) => s.ids);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Se piden una vez al entrar; al quitar uno se saca de la lista sin volver a pedir
  useEffect(() => {
    if (!mounted) return;
    const wanted = useFavoritesStore.getState().ids;
    if (wanted.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await createBrowserClient().from('products').select(CARD_COLUMNS).in('id', wanted).eq('active', true);
      if (cancelled) return;
      const byId = new Map(((data ?? []) as unknown as Product[]).map((p) => [p.id, p]));
      setProducts(wanted.map((id) => byId.get(id)).filter(Boolean) as Product[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  const shown = (products ?? []).filter((p) => ids.includes(p.id));

  return (
    <div className="mx-auto max-w-[1200px] px-2 py-4 md:py-8">
      <h1 className="t-section">Favoritos</h1>
      <p className="mt-1.5 t-caption text-gray-500">Quedan guardados en este dispositivo.</p>

      <div className="mt-6 md:mt-10">
        {products === null ? (
          <ProductGridSkeleton count={4} />
        ) : shown.length === 0 ? (
          <div className="rounded-3xl bg-[#f5f5f7] px-6 py-14 text-center">
            <p className="t-tagline text-gray-900">Todavía no guardaste nada</p>
            <p className="mx-auto mt-2 max-w-[34ch] t-body text-gray-600">
              Tocá el corazón de un producto para tenerlo a mano y volver cuando quieras.
            </p>
            <Link href="/productos" className="btn-apple mt-6">
              Ver productos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-14 xl:grid-cols-4">
            {shown.map((p) => (
              <div key={p.id} data-reveal="card">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
