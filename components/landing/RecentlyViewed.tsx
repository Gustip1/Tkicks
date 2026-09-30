"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getRecent, RecentItem } from '@/lib/recentlyViewed';
import { useDolarRate } from '@/components/DolarRateProvider';
import { formatCurrency } from '@/lib/utils';

/**
 * "Seguí donde lo dejaste": los productos que esta persona ya miró.
 * Sólo aparece para quien vuelve (la lista vive en su navegador), así que a
 * un visitante nuevo no le ocupa lugar.
 *
 * La lista se lee recién después de montar: el servidor no la conoce, y
 * leerla antes haría que el HTML del servidor y el del navegador no coincidan.
 */
export function RecentlyViewed({
  excludeSlug,
  tone = 'light',
  title = 'Seguí donde lo dejaste.',
  subtitle = 'Lo último que miraste.',
}: {
  excludeSlug?: string;
  tone?: 'light' | 'parchment';
  title?: string;
  subtitle?: string;
}) {
  const [items, setItems] = useState<RecentItem[]>([]);
  const { rate } = useDolarRate();

  useEffect(() => {
    setItems(getRecent(excludeSlug).slice(0, 10));
  }, [excludeSlug]);

  if (items.length === 0) return null;

  return (
    <section
      className={`bleed ${tone === 'parchment' ? 'tile-parchment' : 'tile-light'} py-10 md:py-14`}
      aria-labelledby="recent-title"
    >
      <div className="tile-inner">
        <h2 id="recent-title" className="t-section mb-5 md:mb-7">
          {title} <span className="t-muted">{subtitle}</span>
        </h2>

        {/* Scroll horizontal nativo con imán: liviano y natural con el dedo */}
        <ul className="-mx-[22px] md:-mx-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[22px] md:px-10 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((p) => {
            const usd = p.salePrice ?? p.price;
            return (
              <li key={p.slug} className="w-[136px] shrink-0 snap-start md:w-[176px]">
                <Link href={`/producto/${p.slug}`} className="group store-card block p-2.5 md:p-3">
                  <div className="relative aspect-square overflow-hidden rounded-sm bg-parchment">
                    {p.image && (
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        sizes="(max-width: 768px) 136px, 176px"
                        className="object-contain mix-blend-multiply transition-transform duration-700 ease-apple group-hover:scale-[1.04]"
                      />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900">{p.title}</p>
                  <p className={`mt-1 text-[13px] ${p.salePrice ? 'text-red-600' : 'text-gray-700'}`}>
                    {rate > 0 ? formatCurrency(usd * rate) : `USD ${usd.toFixed(0)}`}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
