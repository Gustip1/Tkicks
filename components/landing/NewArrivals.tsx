import Link from 'next/link';
import { Product } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ArrowRight } from 'lucide-react';

interface NewArrivalsProps {
  products: Product[];
  /**
   * true  → productos marcados como "nuevo ingreso" desde el admin (is_new)
   * false → fallback: lo último del catálogo, para que la home nunca quede sin productos
   */
  curated: boolean;
}

export function NewArrivals({ products, curated }: NewArrivalsProps) {
  if (products.length === 0) return null;

  const allHref = curated ? '/nuevos-ingresos' : '/productos';
  const allLabel = curated ? 'Ver todos los ingresos' : 'Ver catálogo completo';

  return (
    <section className="bg-white py-12 md:py-20" aria-labelledby="new-arrivals-title">
      <div className="max-w-[1400px] mx-auto px-4">

        {/* Header */}
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-bold mb-2">
              {curated ? 'Últimos ingresos' : 'Lo último del catálogo'}
            </p>
            <h2 id="new-arrivals-title" className="text-3xl md:text-5xl font-black text-gray-900 leading-none tracking-tight">
              Recién llegados
            </h2>
          </div>
          <Link
            href={allHref}
            className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
          {products.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
        </div>

        <div className="flex justify-center mt-8 md:mt-10">
          <Link
            href={allHref}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border-2 border-gray-900 text-gray-900 text-sm font-black uppercase tracking-tight hover:bg-gray-900 hover:text-white transition-all"
          >
            {allLabel} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
