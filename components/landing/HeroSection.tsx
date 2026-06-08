"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { ArrowRight, Shield, Truck, Zap } from 'lucide-react';
import { Product } from '@/types/db';

export function HeroSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('id, title, slug, price, images, category, on_sale, is_new')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(8);
      if (data?.length) {
        setProducts(data as unknown as Product[]);
        setFeatured(data[0] as unknown as Product);
      }
    })();
  }, []);

  const marqueeItems = [...products, ...products];

  return (
    <section className="relative bg-white overflow-hidden border-b border-gray-100">

      {/* ── Layout split: texto izquierda / imagen derecha ── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center min-h-[75vh] md:min-h-[88vh] gap-8 py-10 md:py-0">

          {/* Columna izquierda — contenido */}
          <div className="flex-1 md:pr-8 lg:pr-16 z-10">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 mb-7">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs text-gray-700 font-bold uppercase tracking-[0.15em]">
                Stock exclusivo · San Juan
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[3rem] md:text-[4rem] lg:text-[5.5rem] font-black text-gray-900 leading-[0.9] tracking-[-0.03em] mb-6">
              Sneakers
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-600 to-gray-400">
                &amp; Streetwear
              </span>
              <br />
              originales.
            </h1>

            {/* Subtítulo */}
            <p className="text-base md:text-lg text-gray-500 leading-relaxed max-w-md mb-8 font-medium">
              Selección curada de lo que está de moda.{' '}
              <span className="text-gray-900 font-bold">100% originales</span>, envíos a todo el país.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                href="/productos"
                className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-gray-900 text-white text-sm font-black uppercase tracking-tight rounded-full hover:bg-black transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Ver colección
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/ofertas"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-transparent text-gray-900 text-sm font-black uppercase tracking-tight rounded-full border border-gray-300 hover:border-gray-600 hover:bg-gray-50 transition-all"
              >
                <Zap className="w-4 h-4 text-yellow-500" />
                Ofertas
              </Link>
            </div>

            {/* Trust pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Shield, text: 'Originales garantizados' },
                { icon: Truck,  text: 'Envíos a todo el país' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200">
                  <Icon className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Columna derecha — producto destacado */}
          <div className="flex-1 relative flex items-center justify-center md:justify-end mt-4 md:mt-0">
            {featured ? (
              <Link
                href={`/producto/${featured.slug}`}
                className="group relative w-full max-w-[420px] md:max-w-none md:w-[480px] lg:w-[540px] aspect-[4/5] rounded-3xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-gray-400 transition-all duration-500"
              >
                {featured.images?.[0]?.url && (
                  <Image
                    src={featured.images[0].url}
                    alt={featured.title}
                    fill
                    sizes="(max-width: 768px) 90vw, 540px"
                    quality={90}
                    priority
                    className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Badge producto */}
                {featured.is_new && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white text-black text-xs font-black uppercase tracking-wider rounded-full">
                    Nuevo
                  </div>
                )}
                {featured.on_sale && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-red-500 text-white text-xs font-black uppercase tracking-wider rounded-full">
                    Sale
                  </div>
                )}

                {/* Info del producto */}
                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                  <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-1">{featured.category}</p>
                  <p className="text-white font-black text-lg md:text-xl leading-tight line-clamp-2">{featured.title}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-white font-black text-lg">${featured.price} USD</span>
                    <span className="inline-flex items-center gap-1 text-xs text-white/70 font-bold">
                      Ver producto <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              /* Skeleton */
              <div className="w-full max-w-[420px] md:w-[480px] lg:w-[540px] aspect-[4/5] rounded-3xl bg-gray-200 animate-pulse" />
            )}

            {/* Miniaturas flotantes */}
            {products.length > 1 && (
              <div className="absolute right-0 md:-right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 md:gap-3">
                {products.slice(1, 4).map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/producto/${p.slug}`}
                    className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-gray-200 hover:border-gray-500 transition-all hover:scale-110 bg-gray-100"
                    style={{ opacity: 1 - i * 0.15 }}
                  >
                    {p.images?.[0]?.url && (
                      <Image src={p.images[0].url} alt={p.title} width={64} height={64} className="w-full h-full object-cover" />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Marquee inferior ── */}
      {products.length > 0 && (
        <div className="border-t border-gray-100 overflow-hidden">
          <div className="flex gap-4 py-3 animate-marquee-products">
            {marqueeItems.map((p, i) => (
              <Link
                key={i}
                href={`/producto/${p.slug}`}
                className="group relative shrink-0 w-[110px] h-[110px] md:w-[130px] md:h-[130px] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-gray-400 transition-all"
              >
                {p.images?.[0]?.url && (
                  <Image src={p.images[0].url} alt={p.title} fill sizes="130px" quality={60} className="object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
