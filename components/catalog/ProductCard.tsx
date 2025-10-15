"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Product } from '@/types/db';
import { formatCurrency } from '@/lib/utils';
import { useDolarRate } from '@/components/DolarRateProvider';

export function ProductCard({ product, usdArsRate = 1 }: { product: Product; usdArsRate?: number }) {
  const [index, setIndex] = useState(0);
  const images = product.images || [];
  const [hovering, setHovering] = useState(false);
  const { rate: dolarOficial } = useDolarRate();
  
  useEffect(() => {
    if (!hovering || images.length <= 1) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % images.length), 700);
    return () => window.clearInterval(timer);
  }, [hovering, images.length]);

  const priceInArs = Number(product.price) * dolarOficial;

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group block rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-sm"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setIndex(0);
      }}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded">
        {images[index]?.url && (
          <Image
            src={images[index].url}
            alt={images[index].alt || product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="mt-2">
        <div className="line-clamp-1 text-sm font-medium text-white">{product.title}</div>
        <div className="text-base font-bold text-white">USD ${Number(product.price).toFixed(2)}</div>
        <div className="text-xs text-neutral-400">{formatCurrency(priceInArs)}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">
            Original 100%
          </span>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">
            En cuotas
          </span>
        </div>
      </div>
    </Link>
  );
}


