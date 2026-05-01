"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export function CategoryShowcase() {
  const [counts, setCounts] = useState({ sneakers: 0, streetwear: 0 });
  const [images, setImages] = useState<{ sneaker: string | null; streetwear: string | null }>({
    sneaker: null,
    streetwear: null,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      // Get counts and sample images
      const [sneakersRes, streetwearRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, images', { count: 'exact' })
          .eq('active', true)
          .eq('category', 'sneakers')
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('products')
          .select('id, images', { count: 'exact' })
          .eq('active', true)
          .eq('category', 'streetwear')
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      setCounts({
        sneakers: sneakersRes.count || 0,
        streetwear: streetwearRes.count || 0,
      });

      const sImg = (sneakersRes.data?.[0] as any)?.images?.[0]?.url || null;
      const stImg = (streetwearRes.data?.[0] as any)?.images?.[0]?.url || null;
      setImages({ sneaker: sImg, streetwear: stImg });
      setLoaded(true);
    })();
  }, []);

  const categories = [
    {
      title: 'Sneakers',
      emoji: '👟',
      count: counts.sneakers,
      href: '/productos?sneakers',
      gradient: 'from-blue-600/30 to-cyan-600/30',
      border: 'border-blue-500/20 hover:border-blue-400/50',
      glow: 'group-hover:shadow-blue-500/20',
      image: images.sneaker,
    },
    {
      title: 'Streetwear',
      emoji: '👕',
      count: counts.streetwear,
      href: '/productos?streetwear',
      gradient: 'from-purple-600/30 to-pink-600/30',
      border: 'border-purple-500/20 hover:border-purple-400/50',
      glow: 'group-hover:shadow-purple-500/20',
      image: images.streetwear,
    },
  ];

  return (
    <section className="bg-black py-8 md:py-14">
      <div className="max-w-[1600px] mx-auto px-4">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight mb-2">
            Elegí tu estilo
          </h2>
          <p className="text-sm md:text-base text-white/40 font-medium">
            {counts.sneakers + counts.streetwear} productos listos para vos
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {!loaded && [0, 1].map((i) => (
            <div
              key={`skeleton-${i}`}
              className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-zinc-800 bg-zinc-900 aspect-[4/3] md:aspect-[16/9] animate-pulse"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
            </div>
          ))}
          {loaded && categories.map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className={`group relative overflow-hidden rounded-2xl md:rounded-3xl border ${cat.border} category-card-hover bg-zinc-950 ${cat.glow}`}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-50 group-hover:opacity-80 transition-opacity duration-500`} />

              {/* Background image */}
              {cat.image && (
                <div className="absolute inset-0 opacity-40 group-hover:opacity-55 transition-opacity duration-500">
                  <Image
                    src={cat.image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 50vw"
                    quality={60}
                    className="object-cover scale-110 group-hover:scale-125 transition-transform duration-700"
                  />
                </div>
              )}

              {/* Content */}
              <div className="relative p-6 md:p-10 lg:p-14 flex flex-col items-start justify-end aspect-[4/3] md:aspect-[16/9]">
                <span className="text-3xl md:text-5xl mb-2 md:mb-3">{cat.emoji}</span>
                <h3 className="text-xl md:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight mb-1">
                  {cat.title}
                </h3>
                <p className="text-xs md:text-sm text-white/50 font-bold">
                  {cat.count > 0 ? `${cat.count} productos` : 'Próximamente'}
                </p>
                <div className="mt-3 md:mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs md:text-sm font-bold group-hover:bg-white/20 transition-all">
                  Explorar →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
