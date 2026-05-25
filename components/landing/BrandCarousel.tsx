"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Brand } from '@/types/db';
import { ArrowRight } from 'lucide-react';

export function BrandCarousel() {
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const { data } = await supabase
        .from('brands')
        .select('*')
        .eq('active', true)
        .order('name');
      if (data) setBrands(data as Brand[]);
    })();
  }, []);

  if (brands.length === 0) return null;

  // Duplicate for seamless loop
  const items = [...brands, ...brands, ...brands];

  return (
    <section className="bg-[#0A0A0A] py-12 md:py-16 border-t border-white/8">
      <div className="max-w-[1400px] mx-auto px-4 mb-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Nuestras marcas</p>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-none tracking-tight">
              Marcas
            </h2>
          </div>
          <Link
            href="/productos"
            className="hidden md:inline-flex items-center gap-2 text-sm font-bold text-white/50 hover:text-white transition-colors"
          >
            Ver todo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Scrolling strip */}
      <div className="overflow-hidden">
        <div className="flex gap-4 animate-marquee-brands">
          {items.map((brand, i) => (
            <Link
              key={`${brand.id}-${i}`}
              href={`/productos?brand=${brand.slug}`}
              className="group shrink-0 flex items-center justify-center px-8 py-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all duration-300 min-w-[160px]"
            >
              <span className="text-white font-black text-lg uppercase tracking-tight group-hover:scale-105 transition-transform duration-300">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
