import { HeroSection } from '@/components/landing/HeroSection';
import { CategoryShowcase } from '@/components/landing/CategoryShowcase';
import { HomepageBrands } from '@/components/landing/HomepageBrands';
import { Reviews } from '@/components/landing/Reviews';
import { HowToBuy } from '@/components/landing/HowToBuy';
import { SocialProofStrip } from '@/components/landing/SocialProofStrip';
import { GiveawayInlinePriceClue } from '@/components/giveaway/GiveawayClue';

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero — solo texto + CTAs */}
      <HeroSection />

      {/* Elegí tu estilo — categorías editoriales (debajo del hero) */}
      <CategoryShowcase />

      {/* Trust strip */}
      <SocialProofStrip />

      {/* Clue sorteo */}
      <div className="flex justify-center py-1 bg-white">
        <GiveawayInlinePriceClue clueId="/" label="Inicio" position={0} digit="2" />
      </div>

      {/* Marcas destacadas — configurables desde el admin */}
      <HomepageBrands />

      {/* Opiniones de clientes */}
      <Reviews />

      {/* Cómo comprar — último bloque antes del footer */}
      <HowToBuy />
    </div>
  );
}
