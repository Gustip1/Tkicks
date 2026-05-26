import { FeaturedCarousels } from '@/components/landing/FeaturedCarousels';
import { NewArrivals } from '@/components/landing/NewArrivals';
import { HeroSection } from '@/components/landing/HeroSection';
import { CategoryShowcase } from '@/components/landing/CategoryShowcase';
import { BrandCarousel } from '@/components/landing/BrandCarousel';
import { HowToBuy } from '@/components/landing/HowToBuy';
import { SocialProofStrip } from '@/components/landing/SocialProofStrip';
import { GiveawayInlinePriceClue } from '@/components/giveaway/GiveawayClue';

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero — fondo negro, split layout */}
      <HeroSection />

      {/* Trust strip */}
      <SocialProofStrip />

      {/* Clue sorteo */}
      <div className="flex justify-center py-1 bg-white">
        <GiveawayInlinePriceClue clueId="/" label="Inicio" position={0} digit="2" />
      </div>

      {/* Categorías editoriales */}
      <CategoryShowcase />

      {/* Nuevos ingresos */}
      <NewArrivals />

      {/* Marcas — carrusel */}
      <BrandCarousel />

      {/* Cómo comprar */}
      <HowToBuy />

      {/* Carruseles destacados */}
      <div className="bg-[#0A0A0A] py-12 md:py-20">
        <FeaturedCarousels />
      </div>
    </div>
  );
}
