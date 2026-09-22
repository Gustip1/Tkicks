"use client";

import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BrandShowcaseProps {
  /** Texto grande que titula la sección (ej. "Eme Studios") */
  title: string;
  /** Subtítulo opcional sobre el título */
  eyebrow?: string;
  /** Filtra por marca (slug en products.brand). Omitir si se usa `category`. */
  brandSlug?: string;
  /** Filtra por categoría (ej. 'sneakers'). Tiene prioridad sobre brandSlug si ambos están. */
  category?: 'sneakers' | 'streetwear';
  /** Destino del botón "Shop now" / "Ver todo" */
  href: string;
  /** Cantidad máxima de productos a traer */
  limit?: number;
  /** Fondo de la franja: se intercalan para mantener el ritmo de apple.com. */
  tone?: 'light' | 'parchment';
  /**
   * Productos ya resueltos server-side (app/page.tsx). Si vienen, este
   * componente no dispara ningún fetch propio — evita que cada carrusel de
   * marca haga su propio round-trip a Supabase en el cliente.
   */
  initialProducts?: Product[];
}

export function BrandShowcase({
  title,
  eyebrow,
  brandSlug,
  category,
  href,
  limit = 10,
  initialProducts,
  tone = 'parchment',
}: BrandShowcaseProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts ?? []);
  const [loading, setLoading] = useState(initialProducts === undefined);

  // Sin autoplay: en apple.com el contenido nunca se mueve solo.
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    // Ya vienen resueltos desde el servidor (app/page.tsx) — no repetir el fetch.
    if (initialProducts !== undefined) return;

    const supabase = createBrowserClient();
    let active = true;

    (async () => {
      try {
        let query = supabase
          .from('products')
          .select('*, product_variants(stock,size)')
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (category) query = query.eq('category', category);
        else if (brandSlug) query = query.eq('brand', brandSlug);

        const { data } = await query;
        if (!active) return;
        if (data) setProducts(data as unknown as Product[]);
      } catch (error) {
        console.error('Error cargando productos de la sección:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [brandSlug, category, limit, initialProducts]);

  // No renderizamos secciones vacías
  if (!loading && products.length === 0) return null;

  return (
    <section className={`bleed tile ${tone === 'light' ? 'tile-light' : 'tile-parchment'}`} aria-label={title}>
      <div className="tile-inner">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-8 md:mb-10" data-reveal="">
          <h2 className="t-section max-w-[26ch]">
            {title}.{eyebrow && <> <span className="t-muted">{eyebrow}.</span></>}
          </h2>
          <Link href={href} className="link-apple t-body">
            Comprar {title}
          </Link>
        </div>

        {/* ── Carrusel ── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden -mx-[22px] px-[22px] md:-mx-10 md:px-10 py-2" ref={emblaRef}>
            <div className="-ml-4 md:-ml-5 flex">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="min-w-0 shrink-0 grow-0 basis-[72%] sm:basis-[44%] md:basis-1/3 xl:basis-1/4 pl-4 md:pl-5"
                >
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={scrollPrev} className="paddle-apple" aria-label="Anterior">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={scrollNext} className="paddle-apple" aria-label="Siguiente">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
