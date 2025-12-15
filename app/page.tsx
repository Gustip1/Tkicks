import { FeaturedCarousels } from '@/components/landing/FeaturedCarousels';
import { NewArrivals } from '@/components/landing/NewArrivals';
import { USPCardCarousel } from '@/components/landing/USPCardCarousel';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-12 bg-black min-h-screen">
      {/* Hero Section - Sin caja, integrado al fondo negro */}
      <section aria-labelledby="hero-title" className="relative bg-black py-8 md:py-12 lg:py-16">
        <h1 id="hero-title" className="sr-only">
          Sneakers & Streetwear 100% originales
        </h1>
        
        {/* Contenido principal */}
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-white font-black uppercase tracking-wide">Únicos en San Juan</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
            Bienvenido a{' '}
            <span className="text-white">
              Tkicks
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-white font-bold mb-8 max-w-2xl">
            Tu destino exclusivo para descubrir lo último en{' '}
            <span className="text-white font-black">Sneakers</span> y{' '}
            <span className="text-white font-black">Streetwear</span>{' '}
            100% originales.
          </p>
          
          <div className="flex flex-wrap gap-4 mb-12">
            <Link
              href="/productos?sneakers"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-black text-sm hover:bg-gray-200 transition-all hover:scale-105 shadow-lg uppercase tracking-tight"
            >
              <span className="text-lg">👟</span>
              Ver Sneakers
            </Link>
            <Link
              href="/productos?streetwear"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-black text-white font-black text-sm hover:bg-zinc-900 transition-all border-2 border-white uppercase tracking-tight"
            >
              <span className="text-lg">👕</span>
              Ver Streetwear
            </Link>
          </div>

          {/* Stats - Integradas al fondo */}
          <div className="flex flex-wrap gap-8 pt-8 border-t border-white/10">
            <div>
              <p className="text-3xl md:text-4xl font-black text-white">100%</p>
              <p className="text-sm text-white font-bold">Original</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-black text-white">🇦🇷</p>
              <p className="text-sm text-white font-bold">Envío nacional</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-black text-white">3x</p>
              <p className="text-sm text-white font-bold">Cuotas sin interés</p>
            </div>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <NewArrivals />

      {/* USP Cards */}
      <USPCardCarousel />
      
      {/* Featured Carousels */}
      <FeaturedCarousels />
    </div>
  );
}
