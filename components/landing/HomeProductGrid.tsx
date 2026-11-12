import Link from 'next/link';
import { Product } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';

/**
 * Productos en grilla, apenas abre la portada.
 *
 * Antes era un carrusel horizontal más abajo: en el celular mostraba dos
 * tarjetas y el resto quedaba escondido de costado. La grilla del catálogo
 * recibe 5 veces más toques que la portada, así que la portada ahora arranca
 * igual: dos columnas, lo que tiene stock primero, y un botón al catálogo.
 */
export function HomeProductGrid({
  products,
  total,
  title = 'Recién llegados',
  headingId = 'home-products-title',
  tone = 'light',
}: {
  products: Product[];
  /** Cuántos hay a la venta: con él se muestra el botón al catálogo */
  total?: number;
  title?: string;
  headingId?: string;
  /** light: sobre blanco · parchment: franja gris con tarjetas blancas */
  tone?: 'light' | 'parchment';
}) {
  if (products.length === 0) return null;

  return (
    <section className={`bleed ${tone === 'parchment' ? 'tile-parchment' : 'tile-light'} pt-10 md:pt-[90px] pb-12 md:pb-[90px]`} aria-labelledby={headingId}>
      <div className="tile-inner">
        <div className="flex items-baseline justify-between gap-4 mb-4 md:mb-10">
          <h2 id={headingId} className="t-section">
            {title}
          </h2>
          <Link href="/productos" className="link-apple t-caption md:t-body">
            Ver todo
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4 md:gap-5">
          {products.map((p) => (
            <li key={p.id} data-reveal="card">
              <ProductCard product={p} />
            </li>
          ))}
        </ul>

        {total !== undefined && (
          <div className="mt-6 md:mt-10 text-center">
            <Link href="/productos" className="btn-apple">
              Ver los {total} productos
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
