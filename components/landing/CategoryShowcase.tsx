"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { ArrowRight } from 'lucide-react';

const SUBCATS = [
  { label: 'Remeras',   href: '/productos?sub=remeras' },
  { label: 'Hoodies',   href: '/productos?sub=hoodies' },
  { label: 'Pantalones',href: '/productos?sub=pantalones' },
  { label: 'Accesorios',href: '/productos?sub=accesorios' },
];

export function CategoryShowcase() {
  const [counts, setCounts]   = useState({ sneakers: 0, streetwear: 0 });
  const [images, setImages]   = useState<{ sneakers: string[]; streetwear: string[] }>({
    sneakers: [], streetwear: [],
  });
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const [snRes, swRes] = await Promise.all([
        supabase.from('products').select('images', { count: 'exact' })
          .eq('active', true).eq('category', 'sneakers')
          .order('created_at', { ascending: false }).limit(3),
        supabase.from('products').select('images', { count: 'exact' })
          .eq('active', true).eq('category', 'streetwear')
          .order('created_at', { ascending: false }).limit(3),
      ]);
      setCounts({ sneakers: snRes.count || 0, streetwear: swRes.count || 0 });
      setImages({
        sneakers:   (snRes.data  || []).map((p: any) => p.images?.[0]?.url).filter(Boolean),
        streetwear: (swRes.data  || []).map((p: any) => p.images?.[0]?.url).filter(Boolean),
      });
      setLoaded(true);
    })();
  }, []);

  return (
    <section className="bg-[#0A0A0A] py-12 md:py-20">
      <div className="max-w-[1400px] mx-auto px-4">

        {/* Section header */}
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Colecciones</p>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-none tracking-tight">
              Elegí tu estilo
            </h2>
          </div>
          <Link href="/productos" className="hidden md:inline-flex items-center gap-2 text-sm font-bold text-white/50 hover:text-white transition-colors">
            Ver todo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid de categorías */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

          {/* ── Sneakers ── */}
          <Link href="/productos?sneakers" className="group relative overflow-hidden rounded-3xl bg-gray-900 aspect-[4/3] md:aspect-[5/4] block">
            {/* Fotos collage */}
            {loaded && images.sneakers.length > 0 ? (
              <>
                <Image
                  src={images.sneakers[0]}
                  alt="Sneakers"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  quality={85}
                  className="object-cover opacity-80 group-hover:opacity-90 group-hover:scale-[1.04] transition-all duration-700"
                />
                {/* Fotos secundarias superpuestas */}
                {images.sneakers[1] && (
                  <div className="absolute bottom-16 md:bottom-20 right-4 md:right-6 w-20 md:w-28 aspect-square rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-4 transition-all duration-500 delay-75">
                    <Image src={images.sneakers[1]} alt="" fill className="object-cover" />
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 animate-pulse" />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <p className="text-white/50 text-xs uppercase tracking-[0.2em] font-bold mb-1">
                {counts.sneakers > 0 ? `${counts.sneakers} modelos` : 'Colección'}
              </p>
              <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-4">
                Sneakers
              </h3>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-black rounded-full group-hover:bg-gray-100 transition-colors">
                Ver colección <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>

          {/* ── Streetwear ── */}
          <div className="flex flex-col gap-4">
            {/* Tile principal */}
            <Link href="/productos?streetwear" className="group relative overflow-hidden rounded-3xl bg-gray-100 aspect-[4/2] block">
              {loaded && images.streetwear.length > 0 ? (
                <Image
                  src={images.streetwear[0]}
                  alt="Streetwear"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  quality={85}
                  className="object-cover opacity-80 group-hover:opacity-95 group-hover:scale-[1.04] transition-all duration-700"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200 animate-pulse" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 flex items-end justify-between">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-[0.2em] font-bold mb-0.5">
                    {counts.streetwear > 0 ? `${counts.streetwear} prendas` : 'Colección'}
                  </p>
                  <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                    Streetwear
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 px-4 py-2 bg-white/10 backdrop-blur-sm text-white text-sm font-bold rounded-full border border-white/20 group-hover:bg-white/20 transition-colors">
                  Ver todo <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>

            {/* Tiles de subcategorías */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {SUBCATS.map((sub, i) => (
                <Link
                  key={sub.label}
                  href={sub.href}
                  className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all duration-200 flex items-center justify-between px-4 py-4 md:py-5"
                >
                  {loaded && images.streetwear[i % images.streetwear.length] && (
                    <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Image src={images.streetwear[i % images.streetwear.length]} alt="" fill className="object-cover" />
                    </div>
                  )}
                  <span className="relative text-sm md:text-base font-black text-white uppercase tracking-tight">
                    {sub.label}
                  </span>
                  <ArrowRight className="relative w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>

        </div>

        {/* CTA mobile */}
        <div className="mt-6 text-center md:hidden">
          <Link href="/productos" className="inline-flex items-center gap-2 text-sm font-bold text-white/60 hover:text-white underline underline-offset-2 transition-colors">
            Ver todos los productos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
