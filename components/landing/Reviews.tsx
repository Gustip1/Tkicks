"use client";

import { useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Star } from 'lucide-react';
import type { TrustStat } from '@/lib/homeContent';

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
              ? 'w-3.5 h-3.5 fill-amber-400 text-amber-400'
              : 'w-3.5 h-3.5 fill-white/15 text-white/15'
          }
        />
      ))}
    </div>
  );
}

/**
 * Un número que cuenta desde 0 la primera vez que entra en pantalla.
 * Pasa una sola vez y está más abajo del pliegue, así que se puede permitir
 * el gesto. Respeta el formato que escribió el dueño ("+400", "4,9", "1.200
 * ventas"): solo anima la parte numérica. Si ya estaba a la vista al cargar,
 * o con movimiento reducido, se muestra el valor final directo.
 */
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const match = value.match(/^(\D*?)(\d[\d.,]*)(.*)$/);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || !match) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    const [, pre, num, post] = match;
    const decimals = /,(\d+)$/.exec(num)?.[1].length ?? 0;
    const target = Number(num.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(target)) return;
    const fmt = (n: number) =>
      pre + n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + post;

    setShown(fmt(0));
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / 1400);
          const eased = 1 - Math.pow(1 - t, 4); // ease-out: arranca rápido y se asienta
          setShown(t < 1 ? fmt(target * eased) : value);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown}
    </span>
  );
}

export function Reviews({
  reviews,
  stats = [],
  brandCount = 0,
}: {
  reviews: Review[];
  /** Los que carga el dueño en /admin/opiniones */
  stats?: TrustStat[];
  /** Marcas activas, sale de la base */
  brandCount?: number;
}) {
  const [emblaRef] = useEmblaCarousel({ align: 'start', dragFree: true, containScroll: 'trimSnaps' });

  if (reviews.length === 0) return null;

  // Primero los del dueño; después los que salen de datos reales, hasta 4
  const rated = reviews.filter((r) => r.rating >= 1 && r.rating <= 5);
  const average = rated.length ? rated.reduce((a, r) => a + r.rating, 0) / rated.length : 0;
  const auto: TrustStat[] = [
    ...(rated.length
      ? [{ value: average.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), label: `promedio en ${rated.length} opiniones` }]
      : []),
    ...(brandCount > 0 ? [{ value: String(brandCount), label: 'marcas originales' }] : []),
  ];
  const shownStats = [...stats, ...auto].slice(0, 4);

  return (
    // Franja oscura: en apple.com las franjas claras y oscuras se alternan
    // y el cambio de color es el divisor entre secciones.
    <section className="bleed tile-dark py-14 md:py-16" aria-labelledby="reviews-title">
      <div className="tile-inner">
        <div className="text-center mb-7 md:mb-9">
          <h2 id="reviews-title" className="t-section max-w-[26ch] mx-auto">
            Lo que dicen. <span className="t-muted">Opiniones reales de quienes ya compraron.</span>
          </h2>
        </div>

        {/* Datos destacados: el número grande en blanco y qué significa en gris */}
        {shownStats.length > 0 && (
          <dl
            className={`mx-auto mb-9 md:mb-12 grid grid-cols-2 gap-x-4 gap-y-6 text-center ${
              shownStats.length >= 4 ? 'md:grid-cols-4 max-w-4xl' : shownStats.length === 3 ? 'md:grid-cols-3 max-w-3xl' : 'max-w-xl'
            }`}
          >
            {shownStats.map((s, i) => (
              <div key={`${s.value}-${i}`} data-reveal="" className="flex flex-col-reverse justify-end items-center gap-1.5">
                <dt className="t-caption text-[#86868b] max-w-[22ch]">{s.label}</dt>
                <dd className="text-[34px] md:text-[48px] leading-none font-semibold tracking-[-0.02em] text-white">
                  <CountUp value={s.value} />
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="overflow-hidden -mx-[22px] px-[22px] md:-mx-10 md:px-10" ref={emblaRef}>
          <div className="flex -ml-4 md:-ml-5">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="min-w-0 shrink-0 grow-0 basis-[85%] sm:basis-1/2 lg:basis-1/3 pl-4 md:pl-5"
              >
                <figure data-reveal="" className="h-full rounded-lg bg-tile-2 p-5 md:p-6 flex flex-col gap-3.5">
                  <Stars rating={r.rating} />
                  <blockquote className="t-body text-[#f5f5f7] flex-1">
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
