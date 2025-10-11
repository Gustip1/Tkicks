import { FeaturedCarousels } from '@/components/landing/FeaturedCarousels';
import { USPCardCarousel } from '@/components/landing/USPCardCarousel';

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section aria-labelledby="hero-title" className="mt-2">
        <h1 id="hero-title" className="sr-only">
          Sneakers & Streetwear 100% originales
        </h1>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-8 md:p-12">
          <div className="relative z-10 max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              Bienvenido a Tkicks
            </h2>
            <p className="mt-4 text-lg md:text-xl text-neutral-200 font-normal">
              Tu destino exclusivo para descubrir lo último en <span className="text-white font-semibold">Sneakers</span> y <span className="text-white font-semibold">Streetwear</span>.
            </p>
            <p className="mt-3 text-base text-neutral-300">
              <span className="inline-block bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                100% Originales
              </span>
              <span className="ml-3 text-neutral-400">•</span>
              <span className="ml-3 text-yellow-400 font-semibold">Únicos en San Juan</span>
            </p>
          </div>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/5 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-white/5 blur-2xl"></div>
        </div>
      </section>

      <FeaturedCarousels />
      <USPCardCarousel />
    </div>
  );
}



