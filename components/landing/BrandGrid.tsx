"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { trackEvent } from '@/lib/analytics/track';

export interface BrandTile {
  id: string;
  title: string;
  eyebrow?: string;
  href: string;
  /** Imagen representativa (producto más reciente de la marca), resuelta en el servidor */
  imageUrl: string | null;
}

interface BrandGridProps {
  tiles: BrandTile[];
}

export function BrandGrid({ tiles }: BrandGridProps) {
  if (tiles.length === 0) return null;

  return (
    <section className="bg-white py-10 md:py-16" aria-labelledby="brand-grid-title">
      <div className="max-w-[1400px] mx-auto px-4">

        {/* ── Header ── */}
        <div className="mb-6 md:mb-10">
          <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-bold mb-2">
            Elegí tu estilo
          </p>
          <h2 id="brand-grid-title" className="text-3xl md:text-5xl font-black text-gray-900 leading-none tracking-tight">
            Comprá por marca
          </h2>
        </div>

        {/* ── Grilla editorial ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
          {tiles.map((tile) => (
            <Link
              key={tile.id}
              href={tile.href}
              onClick={() => trackEvent('brand_tile_click', 'discovery', { brand: tile.id, title: tile.title })}
              className="group relative block overflow-hidden rounded-2xl md:rounded-3xl bg-gray-50 border border-gray-100 hover:border-gray-300 transition-all duration-300 hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.15)]"
            >
              {/* Imagen */}
              <div className="relative aspect-[4/5] md:aspect-[4/3]">
                {tile.imageUrl ? (
                  <Image
                    src={tile.imageUrl}
                    alt={tile.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    quality={85}
                    className="object-contain p-6 md:p-10 transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl md:text-7xl font-black text-gray-200 uppercase select-none">
                      {tile.title.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Texto */}
              <div className="flex items-end justify-between gap-2 px-4 pb-4 md:px-6 md:pb-5">
                <div className="min-w-0">
                  {tile.eyebrow && (
                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold mb-0.5 truncate">
                      {tile.eyebrow}
                    </p>
                  )}
                  <h3 className="text-base md:text-xl font-black text-gray-900 tracking-tight leading-tight truncate">
                    {tile.title}
                  </h3>
                </div>
                <span className="w-8 h-8 md:w-9 md:h-9 rounded-full border border-gray-300 flex items-center justify-center shrink-0 text-gray-400 transition-all duration-300 group-hover:bg-gray-900 group-hover:border-gray-900 group-hover:text-white">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA catálogo completo */}
        <div className="flex justify-center mt-8 md:mt-10">
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border-2 border-gray-900 text-gray-900 text-sm font-black uppercase tracking-tight hover:bg-gray-900 hover:text-white transition-all"
          >
            Ver todo el catálogo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
