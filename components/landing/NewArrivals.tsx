"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ArrowRight, Sparkles } from 'lucide-react';

export function NewArrivals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    let active = true;

    (async () => {
      // Usamos is_new para controlar manualmente qué productos aparecen,
      // y created_at para ordenarlos por los más recientes primero.
      const { data } = await supabase
        .from('products')
        .select('*, product_variants(stock,size)')
        .eq('active', true)
        .eq('is_new', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (!active) return;
      if (data) setProducts(data as unknown as Product[]);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-12 md:py-20" aria-labelledby="new-arrivals-title">
      <div className="max-w-[1400px] mx-auto px-4">

        {/* Header */}
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-bold mb-2">Últimos ingresos</p>
            <h2 id="new-arrivals-title" className="text-3xl md:text-5xl font-black text-gray-900 leading-none tracking-tight">
              Recién llegados
            </h2>
          </div>
          <Link
            href="/nuevos-ingresos"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black transition-colors"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-100 animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
              {products.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            <div className="flex justify-center mt-8 md:mt-10">
              <Link
                href="/nuevos-ingresos"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border-2 border-black text-black text-sm font-black uppercase tracking-tight hover:bg-black hover:text-white transition-all"
              >
                Ver todos los ingresos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

