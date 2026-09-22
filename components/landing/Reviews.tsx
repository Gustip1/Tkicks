"use client";

import useEmblaCarousel from 'embla-carousel-react';
import { Star } from 'lucide-react';

export type Review = {
  id: string;
  name: string;
  rating: number; // 1..5
  text: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= rating
              ? 'w-4 h-4 fill-amber-400 text-amber-400'
              : 'w-4 h-4 fill-white/15 text-white/15'
          }
        />
      ))}
    </div>
  );
}

export function Reviews({ reviews }: { reviews: Review[] }) {
  const [emblaRef] = useEmblaCarousel({ align: 'start', dragFree: true, containScroll: 'trimSnaps' });

  if (reviews.length === 0) return null;

  return (
    // Franja oscura: en apple.com las franjas claras y oscuras se alternan
    // y el cambio de color es el divisor entre secciones.
    <section className="bleed tile tile-dark" aria-labelledby="reviews-title">
      <div className="tile-inner">
        <div className="text-center mb-10 md:mb-14" data-reveal="">
          <h2 id="reviews-title" className="t-display">Lo que dicen.</h2>
          <p className="t-lead text-[#86868b] mt-3">Opiniones reales de quienes ya compraron.</p>
        </div>

        <div className="overflow-hidden -mx-[22px] px-[22px] md:-mx-10 md:px-10" ref={emblaRef}>
          <div className="flex -ml-4 md:-ml-5">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="min-w-0 shrink-0 grow-0 basis-[85%] sm:basis-1/2 lg:basis-1/3 pl-4 md:pl-5"
              >
                <figure data-reveal="" className="h-full rounded-lg bg-tile-2 p-7 md:p-8 flex flex-col gap-5">
                  <Stars rating={r.rating} />
                  <blockquote className="t-tagline font-normal leading-snug text-[#f5f5f7] flex-1">
                    “{r.text.trim().replace(/^["“”«»\s]+|["“”«»\s]+$/g, '')}”
                  </blockquote>
                  <figcaption className="t-caption text-[#86868b]">{r.name}</figcaption>
                </figure>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
