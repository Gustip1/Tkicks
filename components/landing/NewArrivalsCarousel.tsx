"use client";

import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Product } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NewArrivalsCarouselProps {
  /** Productos ya resueltos en el servidor: aparecen en el primer paint */
  products: Product[];
  /**
   * true  → productos marcados como "nuevo ingreso" desde el admin (is_new)
   * false → fallback: lo último del catálogo, para que la home nunca quede sin productos
   */
  curated: boolean;
}

/**
 * Góndola de nuevos ingresos, como las de la Apple Store: titular en dos
 * tonos, tarjetas que se deslizan y flechas circulares abajo a la derecha.
 * Sin rotación automática: en Apple el contenido nunca se mueve solo.
 */
export function NewArrivalsCarousel({ products, curated }: NewArrivalsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    update();
    emblaApi.on('select', update).on('reInit', update).on('scroll', update);
    return () => {
      emblaApi.off('select', update).off('reInit', update).off('scroll', update);
    };
  }, [emblaApi]);

  if (products.length === 0) return null;

  const allHref = curated ? '/nuevos-ingresos' : '/productos';

  return (
    <section className="bleed tile tile-light" aria-labelledby="new-arrivals-title">
      <div className="tile-inner">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-8 md:mb-10" data-reveal="">
          <h2 id="new-arrivals-title" className="t-section max-w-[26ch]">
            Recién llegados.{' '}
            <span className="t-muted">
              {curated ? 'Lo último que entró al showroom.' : 'Lo último del catálogo.'}
            </span>
          </h2>
          <Link href={allHref} className="link-apple t-body">
            Ver todos
          </Link>
        </div>

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

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={scrollPrev} disabled={!canPrev} className="paddle-apple" aria-label="Anterior">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={scrollNext} disabled={!canNext} className="paddle-apple" aria-label="Siguiente">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
