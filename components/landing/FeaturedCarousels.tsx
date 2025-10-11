"use client";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { formatCurrency } from '@/lib/utils';
import { useDolarRate } from '@/components/DolarRateProvider';

function FeaturedSection({ title, products }: { title: string; products: Product[] }) {
  const dolarOficial = useDolarRate();
  const [ref, emblaApi] = useEmblaCarousel({ loop: true, align: 'start', slidesToScroll: 1 }, [
    Autoplay({ delay: 3000, stopOnMouseEnter: true, stopOnInteraction: false })
  ]);
  
  if (products.length === 0) return null;
  
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className="rounded-full bg-neutral-800 p-2 text-white hover:bg-neutral-700"
            aria-label="Anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="rounded-full bg-neutral-800 p-2 text-white hover:bg-neutral-700"
            aria-label="Siguiente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="overflow-hidden" ref={ref} aria-roledescription="carousel">
        <ul className="-ml-4 flex">
          {products.map((p) => (
            <li key={p.id} className="min-w-0 shrink-0 grow-0 basis-full pl-4 sm:basis-1/2 md:basis-1/3">
              <Link href={`/producto/${p.slug}`} className="block rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-sm">
                <div className="relative aspect-square w-full overflow-hidden rounded">
                  {p.images?.[0]?.url && (
                    <Image
                      src={p.images[0].url}
                      alt={p.images[0].alt || p.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 25vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="mt-2">
                  <div className="line-clamp-1 text-sm font-medium text-white">{p.title}</div>
                  <div className="text-base font-bold text-white">USD ${Number(p.price).toFixed(2)}</div>
                  <div className="text-xs text-neutral-400">{formatCurrency(Number(p.price) * dolarOficial)}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function FeaturedCarousels() {
  const [sneakers, setSneakers] = useState<Product[]>([]);
  const [streetwear, setStreetwear] = useState<Product[]>([]);

  useEffect(() => {
    const supabase = createBrowserClient();
    Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('featured_sneakers', true)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('products')
        .select('*')
        .eq('featured_streetwear', true)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(20)
    ]).then(([a, b]) => {
      if (a.data) setSneakers(a.data as unknown as Product[]);
      if (b.data) setStreetwear(b.data as unknown as Product[]);
    });
  }, []);

  return (
    <div className="space-y-10">
      <FeaturedSection title="Sneakers destacados" products={sneakers} />
      <FeaturedSection title="Streetwear destacados" products={streetwear} />
    </div>
  );
}


