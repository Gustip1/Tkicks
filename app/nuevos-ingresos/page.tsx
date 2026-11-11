import Link from 'next/link';
import { ShieldCheck, Truck } from 'lucide-react';
import { Product, groupOf } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CARD_COLUMNS, publicDb } from '@/lib/catalog';

// El stock tiene que ser el real: sin esto Next guarda las respuestas de la base (ver la ficha)
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'Nuevos ingresos | Tkicks',
  description: 'Lo último que llegó a Tkicks: sneakers y streetwear 100% originales, con envío gratis a todo el país.',
};

const FILTERS = [
  { key: 'remeras', label: 'Remeras' },
  { key: 'hoodies', label: 'Hoodies' },
  { key: 'pantalones', label: 'Pantalones' },
  { key: 'sneakers', label: 'Sneakers' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

const inFilter = (p: Product, key: FilterKey) => (key === 'sneakers' ? p.category === 'sneakers' : groupOf(p.subcategory) === key);

/**
 * Nuevos ingresos. Es la página a la que llega el anuncio pago (nov 2026: casi la
 * mitad de las visitas), y el 95% se iba a los 4 segundos sin abrir nada. Arriba
 * van solo el título, por qué comprar acá y las categorías, para que los
 * productos aparezcan enseguida. Antes había una etiqueta chica y un párrafo
 * que los empujaban fuera de la primera pantalla.
 */
export default async function NuevosIngresosPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const { data } = await publicDb()
    .from('products')
    .select(CARD_COLUMNS)
    .eq('active', true)
    .eq('is_new', true)
    .order('created_at', { ascending: false });

  const all = (data ?? []) as unknown as Product[];
  // Solo las categorías que tienen algo nuevo: un filtro que da vacío es una salida
  const filters = FILTERS.filter((f) => all.some((p) => inFilter(p, f.key)));
  const cat = filters.find((f) => f.key === searchParams?.cat)?.key;
  const products = cat ? all.filter((p) => inFilter(p, cat)) : all;

  return (
    <div className="space-y-5 md:space-y-6 pb-8">
      <header>
        <h1 className="t-display text-gray-900">Nuevos ingresos</h1>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 t-caption text-gray-600">
          <li className="inline-flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-gray-900" aria-hidden /> Envío gratis a todo el país
          </li>
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-gray-900" aria-hidden /> 100% originales
          </li>
        </ul>
      </header>

      {filters.length > 1 && (
        <nav aria-label="Categoría" className="-mx-2 flex gap-2 overflow-x-auto px-2 py-0.5 [scrollbar-width:none] md:mx-0 md:px-0">
          <Link prefetch={false} href="/nuevos-ingresos" aria-current={!cat ? 'page' : undefined} className="pill-apple">
            Todo
          </Link>
          {filters.map((f) => (
            <Link
              key={f.key}
              prefetch={false}
              href={`/nuevos-ingresos?cat=${f.key}`}
              aria-current={cat === f.key ? 'page' : undefined}
              className="pill-apple"
            >
              {f.label}
            </Link>
          ))}
        </nav>
      )}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600 font-bold">
            Todavía no hay productos nuevos cargados. Volvé a chequear en unos días.
          </p>
          <Link
            href="/productos"
            className="inline-flex items-center justify-center mt-4 px-6 py-2.5 rounded-full bg-pricing text-white text-sm font-normal hover:bg-pricing-hover transition-colors"
          >
            Ver catálogo general
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
          {products.map((product, idx) => (
            <ProductCard key={product.id} product={product} priority={idx < 2} />
          ))}
        </div>
      )}
    </div>
  );
}
