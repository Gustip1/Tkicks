import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Product } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';

/**
 * Qué ve quien entra a un producto que ya no existe (se vendió y se borró).
 *
 * Es el 10% del tráfico: gente que llega por links viejos de Instagram o por
 * Google. Antes veía "Producto no encontrado" y un botón; ahora ve productos
 * disponibles de la MISMA marca, que es casi siempre lo que andaba buscando.
 * La marca se adivina por el link: los slugs empiezan con ella
 * ("emestudios-thesis-navy-knit-sweater" → EmeStudios).
 */

const LIMIT = 8;

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

const hasStock = (p: any) => (p.product_variants ?? []).some((v: any) => Number(v.stock) > 0);

async function suggestions(rawSlug: string) {
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();
  const supabase = db();

  const { data: brands } = await supabase.from('brands').select('slug,name').eq('active', true);
  const normalized = slug.replace(/[^a-z0-9]/g, '');
  // La marca cuyo slug coincide con el comienzo del link; si hay varias, la más larga
  const brand = (brands ?? [])
    .filter((b) => {
      const bs = String(b.slug).toLowerCase();
      return slug.startsWith(bs) || normalized.startsWith(bs.replace(/[^a-z0-9]/g, ''));
    })
    .sort((a, b) => String(b.slug).length - String(a.slug).length)[0];

  let items: any[] = [];
  if (brand) {
    const { data } = await supabase
      .from('products')
      .select('*, product_variants(stock,size)')
      .eq('active', true)
      .eq('brand', brand.slug)
      .order('created_at', { ascending: false })
      .limit(24);
    items = (data ?? []).filter(hasStock).slice(0, LIMIT);
  }

  // Si la marca no alcanza, se completa con lo último que entró
  if (items.length < 4) {
    const { data } = await supabase
      .from('products')
      .select('*, product_variants(stock,size)')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(24);
    const seen = new Set(items.map((p) => p.id));
    items = [...items, ...(data ?? []).filter((p) => hasStock(p) && !seen.has(p.id))].slice(0, LIMIT);
  }

  return { brand: brand ?? null, items: items as unknown as Product[] };
}

export async function ProductGone({ slug }: { slug: string }) {
  const { brand, items } = await suggestions(slug);

  return (
    <div className="-mt-3 md:-mt-8">
      <section className="bleed tile-light pt-14 md:pt-20 pb-8 md:pb-10 text-center">
        <div className="tile-inner">
          <p className="t-tagline text-[#6e6e73]">Este producto ya se vendió.</p>
          <h1 className="t-display mt-2 max-w-[20ch] mx-auto">
            {brand ? `Mirá lo que tenemos de ${brand.name}.` : 'Mirá lo último que entró.'}
          </h1>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {brand && (
              <Link href={`/productos?brand=${brand.slug}`} className="btn-apple">
                Todo {brand.name}
              </Link>
            )}
            <Link href="/productos" className={brand ? 'btn-apple-ghost' : 'btn-apple'}>
              Ver catálogo
            </Link>
          </div>
        </div>
      </section>

      {items.length > 0 && (
        <section className="bleed tile-parchment py-10 md:py-14">
          <div className="tile-inner">
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
              {items.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
