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

type TileConfig = { sub: string; label?: string; url?: string };

export function CategoryShowcase() {
  // Mapa subcategoría -> url de la imagen a mostrar
  const [images, setImages] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    let active = true;

    (async () => {
      // 1) Imágenes configuradas a mano desde el admin (settings.homepage_categories)
      const { data: settingRow } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'homepage_categories')
        .maybeSingle();

      const configured: Record<string, string> = {};
      const cfg = (settingRow?.value as TileConfig[] | null) || [];
      if (Array.isArray(cfg)) {
        cfg.forEach((t) => {
          if (t?.sub && t?.url) configured[t.sub] = t.url;
        });
      }

      // 2) Para las que no tienen imagen elegida, usamos la última foto del producto más reciente
      const missing = CATS.filter((c) => !configured[c.sub]);
      const fallbacks = await Promise.all(
        missing.map((c) =>
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
      const map: Record<string, string> = { ...configured };
      fallbacks.forEach((res, i) => {
        const imgs = (res.data as any)?.images as { url: string }[] | undefined;
        if (imgs?.length) map[missing[i].sub] = imgs[imgs.length - 1].url;
      });

      setImages(map);
      setLoaded(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="bg-white pt-6 pb-12 md:pt-8 md:pb-16">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* Grilla editorial — accesos directos a categorías */}
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
