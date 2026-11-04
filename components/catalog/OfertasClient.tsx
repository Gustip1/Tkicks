"use client";
import { Product } from '@/types/db';
import { ProductCard } from './ProductCard';

export function OfertasClient({ products }: { products: Product[] }) {
  return (
    <div className="-mt-3 md:-mt-8">
      {/* Presentación en blanco, como el hero de apple.com: titular directo y una línea gris */}
      <section className="bleed tile-light text-center">
        <div className="tile-inner pt-10 pb-6 md:pt-16 md:pb-10">
          <h1 className="t-hero">Ofertas</h1>
          {products.length > 0 && (
            <p className="t-caption md:text-[21px] md:leading-[1.19] mt-3 text-[#6e6e73]">
              {products.length} {products.length === 1 ? 'producto rebajado' : 'productos rebajados'} ahora
            </p>
          )}
        </div>
      </section>

      <div className="pt-8 md:pt-12">
      {/* Contenido */}
      {products.length === 0 ? (
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
            {products.map((p, idx) => (
              <ProductCard key={p.id} product={p} priority={idx < 2} />
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

