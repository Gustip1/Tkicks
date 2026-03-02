"use client";
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { ArrowRight, Truck, Shield, CreditCard, ChevronDown } from 'lucide-react';

export function HeroSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('id, title, slug, price, images, category')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(12);
      if (data) setProducts(data as unknown as Product[]);
      // Trigger entrance animations after a short delay
      setTimeout(() => setLoaded(true), 100);
    })();
  }, []);

  const productImages = products
    .filter((p) => p.images?.[0]?.url)
    .map((p) => ({ url: p.images![0].url, title: p.title, slug: p.slug }));

  // Duplicate for seamless loop
  const marqueeItems = [...productImages, ...productImages];

  return (
    <section className="relative overflow-hidden bg-black">
      {/* Animated gradient background */}
      <div className="absolute inset-0 hero-gradient opacity-40" />
      <div className="absolute inset-0 hero-noise opacity-[0.03]" />

      {/* Glow orbs */}
      <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-purple-600/20 blur-[128px] animate-pulse-slow" />
      <div className="absolute bottom-10 -right-32 w-96 h-96 rounded-full bg-blue-600/20 blur-[128px] animate-pulse-slow animation-delay-2000" />

      <div className="relative max-w-[1600px] mx-auto px-4">
        {/* Main hero content */}
        <div className="pt-8 md:pt-16 lg:pt-20 pb-6 md:pb-10">
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6 md:mb-8 transition-all duration-700 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs md:text-sm text-white/90 font-bold uppercase tracking-widest">
              Drops exclusivos en San Juan
            </span>
          </div>

          {/* Headline */}
          <h1
            className={`text-[2.75rem] md:text-7xl lg:text-8xl font-black text-white leading-[0.95] tracking-tighter mb-5 md:mb-6 transition-all duration-700 delay-150 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Tu estilo.
            <br />
            <span className="hero-text-gradient">Tus kicks.</span>
          </h1>

          {/* Subtitle */}
          <p
            className={`text-base md:text-xl text-white/60 font-medium max-w-lg mb-8 md:mb-10 leading-relaxed transition-all duration-700 delay-300 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Sneakers & Streetwear{' '}
            <span className="text-white font-bold">100% originales</span>.
            Envíos a todo el país. Hasta 3 cuotas sin interés.
          </p>

          {/* CTAs */}
          <div
            className={`flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10 md:mb-14 transition-all duration-700 delay-[450ms] ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <Link
              href="/productos"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-tight hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(255,255,255,0.15)]"
            >
              Explorar catálogo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/ofertas"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white/5 text-white font-black text-sm uppercase tracking-tight border border-white/15 hover:bg-white/10 hover:border-white/30 transition-all backdrop-blur-sm"
            >
              <span className="text-lg">🔥</span>
              Ver ofertas
            </Link>
          </div>

          {/* Trust bar */}
          <div
            className={`flex flex-wrap gap-6 md:gap-10 transition-all duration-700 delay-[600ms] ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            {[
              { icon: Shield, text: '100% Original' },
              { icon: Truck, text: 'Envío nacional' },
              { icon: CreditCard, text: '3 cuotas sin interés' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white/70" />
                </div>
                <span className="text-xs md:text-sm text-white/50 font-bold uppercase tracking-wider">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Product image marquee */}
        {productImages.length > 0 && (
          <div
            className={`relative pb-6 md:pb-10 transition-all duration-1000 delay-700 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

            <div className="overflow-hidden" ref={marqueeRef}>
              <div className="flex gap-3 md:gap-4 animate-marquee-products">
                {marqueeItems.map((img, idx) => (
                  <Link
                    key={idx}
                    href={`/producto/${img.slug}`}
                    className="group relative shrink-0 w-[160px] md:w-[220px] aspect-square rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:scale-[1.03]"
                  >
                    <img
                      src={img.url}
                      alt={img.title}
                      loading={idx < 6 ? 'eager' : 'lazy'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-xs font-bold text-white line-clamp-1">{img.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="flex justify-center pb-4 md:pb-6">
        <button
          onClick={() => {
            document.getElementById('content-start')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-1 text-white/30 hover:text-white/60 transition-colors animate-bounce-gentle"
          aria-label="Scroll para ver más"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest">Descubrí más</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
