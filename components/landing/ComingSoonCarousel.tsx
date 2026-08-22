"use client";

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useCallback } from 'react';
import { Product } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Próximos ingresos: productos que están en tránsito al showroom.
 * La gente puede verlos antes de que lleguen y comprarlos anticipadamente.
 * Se administra desde /admin/proximos (activar/desactivar + elegir productos).
 */
export function ComingSoonCarousel({ products }: { products: Product[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: products.length > 4,
      align: 'start',
      slidesToScroll: 1,
      containScroll: 'trimSnaps',
      dragFree: true,
    },
    [Autoplay({ delay: 4000, stopOnMouseEnter: true, stopOnInteraction: false })]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (products.length === 0) return null;

  return (
    <section className="bg-gray-50 py-10 md:py-16" aria-labelledby="coming-soon-title">
      <div className="max-w-[1400px] mx-auto px-4">

        {/* ── Header ── */}
        <div className="flex items-end justify-between gap-4 mb-6 md:mb-10">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-bold mb-2">
              🚚 En camino al showroom
            </p>
            <h2 id="coming-soon-title" className="text-3xl md:text-5xl font-black text-gray-900 leading-none tracking-tight">
              Próximos ingresos
            </h2>
            <p className="mt-2 text-sm md:text-base text-gray-500 font-bold">
              Todavía no llegaron, pero ya podés verlos y comprarlos anticipado.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={scrollPrev}
              className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-900 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={scrollNext}
              className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-900 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Carrusel ── */}
        <div className="overflow-hidden -mx-4 px-4" ref={emblaRef}>
          <div className="-ml-3 md:-ml-5 flex">
            {products.map((p) => (
              <div
                key={p.id}
                className="min-w-0 shrink-0 grow-0 basis-[44%] sm:basis-[40%] md:basis-1/3 xl:basis-1/4 pl-3 md:pl-5"
              >
                <ProductCard product={p} comingSoon />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
