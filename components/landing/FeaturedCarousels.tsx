"use client";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { formatCurrency, cn } from '@/lib/utils';
import { useDolarRate } from '@/components/DolarRateProvider';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

function ProductSlide({ product }: { product: Product }) {
  const { rate: dolarOficial } = useDolarRate();
  const [imageLoaded, setImageLoaded] = useState(false);
  
  return (
    <Link 
      href={`/producto/${product.slug}`} 
      className="block rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden hover:border-zinc-700 hover:shadow-2xl hover:shadow-white/5 transition-all"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-950">
        {!imageLoaded && <div className="absolute inset-0 bg-zinc-800 animate-pulse" />}
        {product.images?.[0]?.url && (
          <img
            src={product.images[0].url}
            alt={product.images[0].alt || product.title}
            loading="lazy"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-all duration-500 hover:scale-110",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
          />
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-bold">{product.category}</p>
        <h3 className="text-sm font-bold text-white line-clamp-2 mb-2 min-h-[2.5rem]">
          {product.title}
        </h3>
        <p className="text-lg font-black text-white">
          ${Number(product.price).toFixed(2)} USD
        </p>
        <p className="text-sm text-gray-400 font-bold">
          {formatCurrency(Number(product.price) * dolarOficial)}
        </p>
      </div>
    </Link>
  );
}

function SaleSection({ products }: { products: Product[] }) {
  const [ref, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps'
  }, [
    Autoplay({ delay: 3000, stopOnMouseEnter: true, stopOnInteraction: false })
  ]);
  
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  
  if (products.length === 0) return null;
  
  return (
    <section className="space-y-6 bg-black">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
            <span className="text-2xl">🔥</span>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
              Ofertas especiales
            </h2>
            <p className="text-sm text-gray-400 font-bold">No te pierdas estos precios únicos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={scrollPrev}
            className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 hover:border-white transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={scrollNext}
            className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 hover:border-white transition-all"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <Link
            href="/ofertas"
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-black hover:from-red-600 hover:to-orange-600 transition-all shadow-md uppercase tracking-tight"
          >
            Ver todas
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Carousel */}
      <div className="overflow-hidden -mx-4 px-4" ref={ref}>
        <div className="-ml-4 flex">
          {products.map((p) => (
            <div key={p.id} className="min-w-0 shrink-0 grow-0 basis-[280px] md:basis-[300px] pl-4">
              <ProductSlide product={p} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Mobile CTA */}
      <Link
        href="/ofertas"
        className="md:hidden flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-medium"
      >
        Ver todas las ofertas
        <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}

function FeaturedSection({ title, products, type }: { title: string; products: Product[]; type: 'sneakers' | 'streetwear' }) {
  const [ref, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps'
  }, [
    Autoplay({ delay: 3500, stopOnMouseEnter: true, stopOnInteraction: false })
  ]);
  
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  
  if (products.length === 0) return null;

  const config = type === 'sneakers' 
    ? {
        gradient: 'from-blue-500 to-cyan-500',
        icon: '👟',
        linkHref: '/productos?sneakers',
        bgIcon: 'bg-gradient-to-br from-blue-500 to-cyan-500'
      }
    : {
        gradient: 'from-purple-500 to-pink-500',
        icon: '👕',
        linkHref: '/productos?streetwear',
        bgIcon: 'bg-gradient-to-br from-purple-500 to-pink-500'
      };
  
  return (
    <section className="space-y-6 bg-black">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl ${config.bgIcon} flex items-center justify-center shadow-lg`}>
            <span className="text-2xl">{config.icon}</span>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-gray-400 font-bold">Productos seleccionados para ti</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={scrollPrev}
            className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 hover:border-white transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={scrollNext}
            className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 hover:border-white transition-all"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
          <Link
            href={config.linkHref}
            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${config.gradient} text-white text-sm font-black hover:opacity-90 transition-all shadow-md uppercase tracking-tight`}
          >
            Ver todos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Carousel */}
      <div className="overflow-hidden -mx-4 px-4 bg-black" ref={ref}>
        <div className="-ml-4 flex">
          {products.map((p) => (
            <div key={p.id} className="min-w-0 shrink-0 grow-0 basis-[280px] md:basis-[300px] pl-4">
              <ProductSlide product={p} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Mobile CTA */}
      <Link
        href={config.linkHref}
        className={`md:hidden flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r ${config.gradient} text-white text-sm font-black uppercase tracking-tight`}
      >
        Ver todos los {type === 'sneakers' ? 'sneakers' : 'streetwear'}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}

export function FeaturedCarousels() {
  const [sneakers, setSneakers] = useState<Product[]>([]);
  const [streetwear, setStreetwear] = useState<Product[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('on_sale', true)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('products')
        .select('*')
        .eq('featured_sneakers', true)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('products')
        .select('*')
        .eq('featured_streetwear', true)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(12)
    ]).then(([sale, a, b]) => {
      if (sale.data) setSaleProducts(sale.data as unknown as Product[]);
      if (a.data) setSneakers(a.data as unknown as Product[]);
      if (b.data) setStreetwear(b.data as unknown as Product[]);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-12">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl skeleton" />
              <div className="space-y-2">
                <div className="w-48 h-6 rounded skeleton" />
                <div className="w-32 h-4 rounded skeleton" />
              </div>
            </div>
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="w-[280px] shrink-0 rounded-2xl overflow-hidden">
                  <div className="aspect-square skeleton" />
                  <div className="p-4 space-y-2">
                    <div className="w-16 h-3 rounded skeleton" />
                    <div className="w-full h-4 rounded skeleton" />
                    <div className="w-24 h-5 rounded skeleton" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {saleProducts.length > 0 && <SaleSection products={saleProducts} />}
      {sneakers.length > 0 && <FeaturedSection title="Sneakers destacados" products={sneakers} type="sneakers" />}
      {streetwear.length > 0 && <FeaturedSection title="Streetwear destacados" products={streetwear} type="streetwear" />}
    </div>
  );
}
