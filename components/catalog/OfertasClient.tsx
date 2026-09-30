"use client";
import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { ProductCard } from './ProductCard';
import { ProductGridSkeleton } from './ProductsClient';

export function OfertasClient() {
  const supabase = useRef(createBrowserClient());
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.current
        .from('products')
        .select('*, product_variants(stock,size)')
        .eq('on_sale', true)
        .eq('active', true)
        .order('created_at', { ascending: false });
      
      setProducts((data || []) as unknown as Product[]);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="-mt-3 md:-mt-8">
      {/* Franja negra de campaña, como las de apple.com: sin degradés ni adornos */}
      <section className="bleed tile-black text-center">
        <div className="tile-inner py-14 md:py-20">
          <h1 className="t-display max-w-[20ch] mx-auto">
            Ofertas. <span className="t-muted">Originales, con precio rebajado.</span>
          </h1>
          {!loading && products.length > 0 && (
            <p className="t-caption mt-4 text-[#86868b]">
              {products.length} {products.length === 1 ? 'producto rebajado' : 'productos rebajados'} ahora
            </p>
          )}
        </div>
      </section>

      <div className="pt-8 md:pt-12">
      {/* Contenido */}
      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="t-tagline text-gray-900">No hay ofertas en este momento.</p>
          <p className="t-body mt-2 text-gray-500">Las rebajas entran y salen rápido. Mientras tanto, mirá lo último que llegó.</p>
          <a href="/nuevos-ingresos" className="btn-apple mt-6">Ver nuevos ingresos</a>
        </div>
      ) : (
        <div>
          {/* Grid de productos — misma grilla que el catálogo para que las
              imágenes ocupen el mismo espacio en toda la web */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 md:gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

