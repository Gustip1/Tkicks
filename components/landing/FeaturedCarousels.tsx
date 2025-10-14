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

function SaleSection({ products }: { products: Product[] }) {
  const dolarOficial = useDolarRate();
  const [ref, emblaApi] = useEmblaCarousel({ loop: true, align: 'start', slidesToScroll: 1 }, [
    Autoplay({ delay: 2500, stopOnMouseEnter: true, stopOnInteraction: false })
  ]);
  
  if (products.length === 0) return null;
  
  return (
    <section className="space-y-4 relative">
      {/* Header súper llamativo */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 p-6 shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full animate-pulse">
                <span className="text-2xl">🔥</span>
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">
                  ¡OFERTAS ESPECIALES!
                </h2>
                <p className="text-red-100 text-sm font-medium">
                  No te pierdas estos precios únicos
                </p>
              </div>
            </div>
            <Link
              href="/ofertas"
              className="hidden md:flex items-center gap-2 bg-white text-red-600 px-5 py-2.5 rounded-full font-bold text-sm hover:bg-red-50 transition-all hover:scale-105 shadow-lg"
            >
              Ver todas
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Link>
          </div>
        </div>
        {/* Efectos decorativos */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      {/* Controles del carousel */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className="rounded-full bg-red-600 p-2.5 text-white hover:bg-red-700 shadow-lg transition-all hover:scale-110"
            aria-label="Anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="rounded-full bg-red-600 p-2.5 text-white hover:bg-red-700 shadow-lg transition-all hover:scale-110"
            aria-label="Siguiente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
        <Link
          href="/ofertas"
          className="md:hidden flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-red-700 transition-all shadow-lg"
        >
          Ver todas
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </Link>
      </div>

      {/* Carousel de productos */}
      <div className="overflow-hidden" ref={ref} aria-roledescription="carousel">
        <ul className="-ml-4 flex">
          {products.map((p) => (
            <li key={p.id} className="min-w-0 shrink-0 grow-0 basis-1/3 pl-4 sm:basis-1/2 md:basis-1/3">
              <Link href={`/producto/${p.slug}`} className="block rounded-xl border-2 border-red-500 bg-gradient-to-br from-red-950 to-neutral-900 p-4 shadow-xl hover:shadow-2xl hover:scale-105 transition-all relative overflow-hidden group">
                {/* Badge de SALE */}
                <div className="absolute top-2 right-2 z-10 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase shadow-lg animate-pulse">
                  🔥 SALE
                </div>
                
                <div className="relative aspect-square w-full overflow-hidden rounded-lg ring-2 ring-red-500/50">
                  {p.images?.[0]?.url && (
                    <Image
                      src={p.images[0].url}
                      alt={p.images[0].alt || p.title}
                      fill
                      sizes="(max-width: 768px) 33vw, 25vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="mt-3">
                  <div className="line-clamp-1 text-sm font-bold text-white">{p.title}</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <div className="text-lg font-black text-red-400">USD ${Number(p.price).toFixed(2)}</div>
                  </div>
                  <div className="text-xs text-red-300 font-medium">{formatCurrency(Number(p.price) * dolarOficial)}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FeaturedSection({ title, products, type }: { title: string; products: Product[]; type: 'sneakers' | 'streetwear' }) {
  const dolarOficial = useDolarRate();
  const [ref, emblaApi] = useEmblaCarousel({ loop: true, align: 'start', slidesToScroll: 1 }, [
    Autoplay({ delay: 3000, stopOnMouseEnter: true, stopOnInteraction: false })
  ]);
  
  if (products.length === 0) return null;

  // Configuración de colores por tipo
  const config = type === 'sneakers' 
    ? {
        gradient: 'from-blue-600 via-blue-500 to-cyan-500',
        badge: 'bg-blue-600',
        icon: '👟',
        btnBg: 'bg-blue-600 hover:bg-blue-700',
        btnText: 'text-blue-600',
        cardBorder: 'border-blue-500',
        cardBg: 'from-blue-950 to-neutral-900',
        ring: 'ring-blue-500/50',
        textColor: 'text-blue-400',
        accentColor: 'text-blue-300',
        badgeText: 'DESTACADO',
        linkHref: '/productos?sneakers',
        titleColor: 'text-blue-100'
      }
    : {
        gradient: 'from-purple-600 via-purple-500 to-pink-500',
        badge: 'bg-purple-600',
        icon: '👕',
        btnBg: 'bg-purple-600 hover:bg-purple-700',
        btnText: 'text-purple-600',
        cardBorder: 'border-purple-500',
        cardBg: 'from-purple-950 to-neutral-900',
        ring: 'ring-purple-500/50',
        textColor: 'text-purple-400',
        accentColor: 'text-purple-300',
        badgeText: 'DESTACADO',
        linkHref: '/productos?streetwear',
        titleColor: 'text-purple-100'
      };
  
  return (
    <section className="space-y-4 relative">
      {/* Header llamativo */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${config.gradient} p-6 shadow-2xl`}>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full">
                <span className="text-2xl">{config.icon}</span>
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">
                  {title}
                </h2>
                <p className={`${config.titleColor} text-sm font-medium`}>
                  Productos seleccionados para ti
                </p>
              </div>
            </div>
            <Link
              href={config.linkHref}
              className="hidden md:flex items-center gap-2 bg-white text-inherit px-5 py-2.5 rounded-full font-bold text-sm hover:bg-white/90 transition-all hover:scale-105 shadow-lg"
              style={{ color: type === 'sneakers' ? '#2563eb' : '#9333ea' }}
            >
              Ver todos
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Link>
          </div>
        </div>
        {/* Efectos decorativos */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      {/* Controles del carousel */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className={`rounded-full ${config.btnBg} p-2.5 text-white shadow-lg transition-all hover:scale-110`}
            aria-label="Anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className={`rounded-full ${config.btnBg} p-2.5 text-white shadow-lg transition-all hover:scale-110`}
            aria-label="Siguiente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
        <Link
          href={config.linkHref}
          className={`md:hidden flex items-center gap-2 ${config.btnBg} text-white px-4 py-2 rounded-full font-bold text-sm transition-all shadow-lg`}
        >
          Ver todos
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </Link>
      </div>

      {/* Carousel de productos */}
      <div className="overflow-hidden" ref={ref} aria-roledescription="carousel">
        <ul className="-ml-4 flex">
          {products.map((p) => (
            <li key={p.id} className="min-w-0 shrink-0 grow-0 basis-1/3 pl-4 sm:basis-1/2 md:basis-1/3">
              <Link href={`/producto/${p.slug}`} className={`block rounded-xl border-2 ${config.cardBorder} bg-gradient-to-br ${config.cardBg} p-4 shadow-xl hover:shadow-2xl hover:scale-105 transition-all relative overflow-hidden group`}>
                {/* Badge destacado */}
                <div className={`absolute top-2 right-2 z-10 ${config.badge} text-white px-3 py-1 rounded-full text-xs font-black uppercase shadow-lg`}>
                  {config.icon} {config.badgeText}
                </div>
                
                <div className={`relative aspect-square w-full overflow-hidden rounded-lg ${config.ring} ring-2`}>
                  {p.images?.[0]?.url && (
                    <Image
                      src={p.images[0].url}
                      alt={p.images[0].alt || p.title}
                      fill
                      sizes="(max-width: 768px) 33vw, 25vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="mt-3">
                  <div className="line-clamp-1 text-sm font-bold text-white">{p.title}</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <div className={`text-lg font-black ${config.textColor}`}>USD ${Number(p.price).toFixed(2)}</div>
                  </div>
                  <div className={`text-xs ${config.accentColor} font-medium`}>{formatCurrency(Number(p.price) * dolarOficial)}</div>
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
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);

  useEffect(() => {
    const supabase = createBrowserClient();
    Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('on_sale', true)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(20),
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
    ]).then(([sale, a, b]) => {
      if (sale.data) setSaleProducts(sale.data as unknown as Product[]);
      if (a.data) setSneakers(a.data as unknown as Product[]);
      if (b.data) setStreetwear(b.data as unknown as Product[]);
    });
  }, []);

  return (
    <div className="space-y-10">
      {saleProducts.length > 0 && <SaleSection products={saleProducts} />}
      <FeaturedSection title="Sneakers destacados" products={sneakers} type="sneakers" />
      <FeaturedSection title="Streetwear destacados" products={streetwear} type="streetwear" />
    </div>
  );
}


