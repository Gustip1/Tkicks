import { createClient } from '@supabase/supabase-js';
import { Product } from '@/types/db';
import { HeroSection } from '@/components/landing/HeroSection';
import { CategoryShowcase } from '@/components/landing/CategoryShowcase';
import { NewArrivalsCarousel } from '@/components/landing/NewArrivalsCarousel';
import { HomepageBrands } from '@/components/landing/HomepageBrands';
import { Reviews } from '@/components/landing/Reviews';
import { HowToBuy } from '@/components/landing/HowToBuy';
import { SocialProofStrip } from '@/components/landing/SocialProofStrip';
import { PromoBanner } from '@/components/promo/PromoBanner';
import { GiveawayInlinePriceClue } from '@/components/giveaway/GiveawayClue';
import {
  HeroContent,
  DEFAULT_HERO_CONTENT,
  HowToBuyContent,
  DEFAULT_HOW_TO_BUY_CONTENT,
  SocialProofContent,
  DEFAULT_SOCIAL_PROOF_CONTENT,
  PromoBannerContent,
  DEFAULT_PROMO_BANNER_CONTENT,
} from '@/lib/homeContent';

// ISR: la home se sirve estática y se refresca cada 5 minutos,
// así los nuevos ingresos aparecen en el primer render (sin skeletons).
export const revalidate = 300;

interface HomeContent {
  hero: HeroContent;
  howToBuy: HowToBuyContent;
  socialProof: SocialProofContent;
  banner: PromoBannerContent;
}

async function getHomeContent(): Promise<HomeContent> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['homepage_hero', 'homepage_how_to_buy', 'homepage_social_proof', 'homepage_banner']);

  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));

  return {
    hero: { ...DEFAULT_HERO_CONTENT, ...(byKey.get('homepage_hero') as Partial<HeroContent> | undefined) },
    howToBuy: { ...DEFAULT_HOW_TO_BUY_CONTENT, ...(byKey.get('homepage_how_to_buy') as Partial<HowToBuyContent> | undefined) },
    socialProof: { ...DEFAULT_SOCIAL_PROOF_CONTENT, ...(byKey.get('homepage_social_proof') as Partial<SocialProofContent> | undefined) },
    banner: { ...DEFAULT_PROMO_BANNER_CONTENT, ...(byKey.get('homepage_banner') as Partial<PromoBannerContent> | undefined) },
  };
}

async function getHomeProducts(): Promise<{ products: Product[]; curated: boolean }> {
  // Cliente anónimo sin cookies: mantiene la página estática (ISR)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: newArrivals } = await supabase
    .from('products')
    .select('*, product_variants(stock,size)')
    .eq('active', true)
    .eq('is_new', true)
    .order('created_at', { ascending: false })
    .limit(12);

  if (newArrivals && newArrivals.length > 0) {
    return { products: newArrivals as unknown as Product[], curated: true };
  }

  // Fallback: si no hay productos marcados como "nuevo ingreso" en el admin
  // (o la query falló), la home muestra igual lo último del catálogo.
  const { data: latest } = await supabase
    .from('products')
    .select('*, product_variants(stock,size)')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(12);

  return { products: (latest ?? []) as unknown as Product[], curated: false };
}

export default async function HomePage() {
  const [{ products, curated }, content] = await Promise.all([
    getHomeProducts(),
    getHomeContent(),
  ]);

  return (
    <div className="bg-white">
      {/* Hero — solo texto + CTAs */}
      <HeroSection content={content.hero} />

      {/* Banner promocional — solo se muestra si está habilitado desde /admin/portada */}
      <PromoBanner content={content.banner} />

      {/* Elegí tu estilo — remeras / hoodies / pantalones */}
      <CategoryShowcase />

      {/* Nuevos ingresos en carrusel — server-rendered */}
      <NewArrivalsCarousel products={products} curated={curated} />

      {/* Trust strip */}
      <SocialProofStrip content={content.socialProof} />

      {/* Clue sorteo */}
      <div className="flex justify-center py-1 bg-white">
        <GiveawayInlinePriceClue clueId="/" label="Inicio" position={0} digit="2" />
      </div>

      {/* Carruseles por marca — configurables desde /admin/portada */}
      <HomepageBrands />

      {/* Opiniones de clientes */}
      <Reviews />

      {/* Cómo comprar — último bloque antes del footer */}
      <HowToBuy content={content.howToBuy} />
    </div>
  );
}
