"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { ArrowRight } from 'lucide-react';

const CATS = [
  { label: 'Remeras',    sub: 'remeras' },
  { label: 'Hoodies',    sub: 'hoodies' },
  { label: 'Pantalones', sub: 'pantalones' },
] as const;

export function CategoryShowcase() {
  // Mapa subcategoría -> url de la última foto del producto más reciente
  const [images, setImages] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    let active = true;

    (async () => {
      const results = await Promise.all(
        CATS.map((c) =>
          supabase
            .from('products')
            .select('images')
            .eq('active', true)
            .eq('subcategory', c.sub)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        )
      );

      if (!active) return;
      const map: Record<string, string> = {};
      results.forEach((res, i) => {
        const imgs = (res.data as any)?.images as { url: string }[] | undefined;
        // "la última foto" del producto
        if (imgs?.length) map[CATS[i].sub] = imgs[imgs.length - 1].url;
      });
      setImages(map);
      setLoaded(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="bg-white py-12 md:py-20">
      <div className="max-w-[1400px] mx-auto px-4">

        {/* Section header */}
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-bold mb-2">Colecciones</p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-none tracking-tight">
              Elegí tu estilo
            </h2>
          </div>
          <Link href="/productos?streetwear" className="hidden md:inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
            Ver todo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grilla editorial */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {CATS.map((c) => (
            <Link
              key={c.sub}
              href={`/productos?streetwear&sub=${c.sub}`}
              className="group block"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 rounded-2xl">
                {loaded && images[c.sub] ? (
                  <Image
                    src={images[c.sub]}
                    alt={c.label}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    quality={90}
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
                )}
              </div>
              <div className="flex items-center justify-between mt-3 md:mt-4">
                <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                  {c.label}
                </h3>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
