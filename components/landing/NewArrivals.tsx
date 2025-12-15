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
      // Usamos created_at para traer los productos más recientes sin configurarlos a mano
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
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
    <section className="bg-black" aria-labelledby="new-arrivals-title">
      <div className="max-w-[1600px] mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 id="new-arrivals-title" className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                Nuevos ingresos
              </h2>
              <p className="text-sm text-gray-400 font-bold">Lo último que llegó a Tkicks</p>
            </div>
          </div>
          <Link
            href="/productos"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-black hover:bg-gray-100 transition-colors uppercase tracking-tight"
          >
            Ver todo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {[...Array(8)].map((_, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse h-[220px] md:h-[260px]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <Link
          href="/productos"
          className="sm:hidden flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white text-black text-sm font-black uppercase tracking-tight"
        >
          Ver catálogo completo
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

