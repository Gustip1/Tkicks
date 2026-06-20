import { NewArrivals } from '@/components/landing/NewArrivals';
import { HeroSection } from '@/components/landing/HeroSection';
import { CategoryShowcase } from '@/components/landing/CategoryShowcase';
import { BrandShowcase } from '@/components/landing/BrandShowcase';
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

      {/* Elegí tu estilo — categorías editoriales */}
      <CategoryShowcase />

      {/* Nuevos ingresos — sección protagonista */}
      <NewArrivals />

      {/* Marcas destacadas — bloques individuales */}
      <BrandShowcase title="Eme Studios"   eyebrow="Marca destacada" brandSlug="emestudios"   href="/productos?brand=emestudios" />
      <BrandShowcase title="Scuffers"      eyebrow="Marca destacada" brandSlug="scuffers"    href="/productos?brand=scuffers" />
      <BrandShowcase title="Valley"        eyebrow="Vale Forever"    brandSlug="valley"      href="/productos?brand=valley" />
      <BrandShowcase title="Mixed Emotion" eyebrow="Marca destacada" brandSlug="mixedemotion" href="/productos?brand=mixedemotion" />
      <BrandShowcase title="Sneakers"      eyebrow="Sneakers"         category="sneakers"     href="/productos?sneakers" />

      {/* Cómo comprar — último bloque antes del footer */}
      <HowToBuy />
    </div>
  );
}
