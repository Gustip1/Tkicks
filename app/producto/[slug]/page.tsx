import type { Metadata } from 'next';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Product, ProductVariant } from '@/types/db';
import { ProductView } from './parts/ProductView';
import { ProductGone } from './parts/ProductGone';

/**
 * Ficha de producto, resuelta en el servidor.
 *
 * Antes era una página de cliente: llegaba un esqueleto vacío y el celular
 * pedía el producto a la base recién después de cargar el JS. Eso la hacía
 * lenta con datos móviles (93% del tráfico), Google indexaba el esqueleto y
 * los links compartidos por WhatsApp/Instagram salían sin foto ni nombre.
 *
 * Se genera en cada visita (no se cachea) porque el stock cambia con cada
 * venta y la ficha tiene que mostrar los talles reales.
 */
export const dynamic = 'force-dynamic';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tkicks.com.ar').replace(/\/$/, '');

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

/** Una sola consulta por visita aunque la usen la metadata y la página. */
const getProduct = cache(async (rawSlug: string) => {
  // ilike + trim: tolera links viejos con mayúsculas o espacios distintos al slug real
  const slug = decodeURIComponent(rawSlug).trim();
  const supabase = db();
  const { data: product } = await supabase.from('products').select('*').ilike('slug', slug).maybeSingle();
  if (!product) return null;

  const [{ data: variants }, { data: brand }, { data: offersRow }] = await Promise.all([
    supabase.from('product_variants').select('*').eq('product_id', product.id).order('size', { ascending: true }),
    product.brand
      ? supabase.from('brands').select('name').eq('slug', product.brand).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('settings').select('value').eq('key', 'offers_enabled').maybeSingle(),
  ]);

  return {
    product: product as unknown as Product,
    variants: (variants ?? []) as unknown as ProductVariant[],
    brandName: (brand as { name?: string } | null)?.name ?? null,
    offersEnabled: Boolean((offersRow?.value as { active?: boolean } | null)?.active),
  };
});

function activePrice(p: Product) {
  const sale = p.sale_price != null && Number(p.sale_price) > 0;
  return sale ? Number(p.sale_price) : Number(p.price);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getProduct(params.slug);

  if (!data) {
    // El producto ya no existe: la página muestra alternativas, pero Google no
    // la tiene que indexar (así las fichas viejas salen del buscador solas).
    return { title: 'Producto no disponible | Tkicks', robots: { index: false, follow: true } };
  }

  const { product, brandName } = data;
  const image = product.images?.[0]?.url;
  const desc =
    (product.description?.trim() && product.description.trim().slice(0, 155)) ||
    `${product.title}${brandName ? ` de ${brandName}` : ''}, 100% original. USD ${activePrice(product).toFixed(0)}. Envíos a todo el país desde San Juan.`;

  return {
    title: `${product.title} | Tkicks`,
    description: desc,
    alternates: { canonical: `${SITE}/producto/${product.slug}` },
    // La vista previa que se ve al compartir el link por WhatsApp o Instagram
    openGraph: {
      title: product.title,
      description: desc,
      url: `${SITE}/producto/${product.slug}`,
      siteName: 'Tkicks',
      locale: 'es_AR',
      type: 'website',
      images: image ? [{ url: image, width: 1400, height: 1400, alt: product.title }] : undefined,
    },
    twitter: { card: 'summary_large_image', title: product.title, description: desc, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const data = await getProduct(params.slug);
  if (!data) return <ProductGone slug={params.slug} />;

  const { product, variants, brandName, offersEnabled } = data;
  const inStock = variants.some((v) => Number(v.stock) > 0);

  // Datos estructurados: le dicen a Google qué es, cuánto sale y si hay stock
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: (product.images ?? []).map((i) => i.url),
    description: product.description || undefined,
    sku: String(product.id),
    brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${SITE}/producto/${product.slug}`,
      priceCurrency: 'USD',
      price: activePrice(product).toFixed(2),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Tkicks' },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify ya escapa comillas; se escapa "<" para que ningún texto cierre la etiqueta
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <ProductView product={product} variants={variants} offersEnabled={offersEnabled} />
    </>
  );
}
