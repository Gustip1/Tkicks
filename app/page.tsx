import { createClient } from '@supabase/supabase-js';
import { Product } from '@/types/db';
import { HeroSection } from '@/components/landing/HeroSection';
import { NewArrivalsCarousel } from '@/components/landing/NewArrivalsCarousel';
import { BrandGrid, BrandTile } from '@/components/landing/BrandGrid';
import { Reviews } from '@/components/landing/Reviews';
import { HowToBuy } from '@/components/landing/HowToBuy';
import { SocialProofStrip } from '@/components/landing/SocialProofStrip';
import { GiveawayInlinePriceClue } from '@/components/giveaway/GiveawayClue';

// ISR: la home se sirve estática y se refresca cada 5 minutos,
// así los productos aparecen en el primer render (sin skeletons).
export const revalidate = 300;

type BrandEntry = {
  id: string;
  kind: 'brand' | 'sneakers';
  slug?: string;
  title: string;
  eyebrow?: string;
};

// Misma configuración que maneja el admin en /admin/portada (settings.homepage_brands)
const DEFAULT_BRAND_ENTRIES: BrandEntry[] = [
  { id: 'sneakers', kind: 'sneakers', title: 'Sneakers', eyebrow: 'Calzado' },
  { id: 'emestudios', kind: 'brand', slug: 'emestudios', title: 'Eme Studios', eyebrow: 'Streetwear' },
  { id: 'scuffers', kind: 'brand', slug: 'scuffers', title: 'Scuffers', eyebrow: 'Streetwear' },
  { id: 'valley', kind: 'brand', slug: 'valley', title: 'Valley', eyebrow: 'Vale Forever' },
  { id: 'mixedemotion', kind: 'brand', slug: 'mixedemotion', title: 'Mixed Emotion', eyebrow: 'Streetwear' },
];

async function getHomeData(): Promise<{
  products: Product[];
  curated: boolean;
  brandTiles: BrandTile[];
}> {
  // Cliente anónimo sin cookies: mantiene la página estática (ISR)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── Nuevos ingresos ──
  const { data: newArrivals } = await supabase
    .from('products')
    .select('*, product_variants(stock,size)')
    .eq('active', true)
    .eq('is_new', true)
    .order('created_at', { ascending: false })
    .limit(12);

  let products = (newArrivals ?? []) as unknown as Product[];
  const curated = products.length > 0;

  // Fallback: si no hay productos marcados como "nuevo ingreso" en el admin
  // (o la query falló), la home muestra igual lo último del catálogo.
  if (!curated) {
    const { data: latest } = await supabase
      .from('products')
      .select('*, product_variants(stock,size)')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(12);
    products = (latest ?? []) as unknown as Product[];
  }

  // ── Marcas: lista curada desde el admin (settings.homepage_brands) ──
  const { data: settingRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'homepage_brands')
    .maybeSingle();

  const cfg = settingRow?.value as BrandEntry[] | null;
  const entries = Array.isArray(cfg) && cfg.length > 0 ? cfg : DEFAULT_BRAND_ENTRIES;

  // Imagen representativa de cada marca: su producto más reciente
  const tileImages = await Promise.all(
    entries.map((e) => {
      let q = supabase
        .from('products')
        .select('images')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      q = e.kind === 'sneakers' ? q.eq('category', 'sneakers') : q.eq('brand', e.slug ?? '');
      return q.maybeSingle();
    })
  );

  const brandTiles: BrandTile[] = entries.map((e, i) => {
    const imgs = (tileImages[i].data as { images?: { url: string }[] } | null)?.images;
    return {
      id: e.slug ?? e.id,
      title: e.title,
      eyebrow: e.eyebrow,
      href: e.kind === 'sneakers' ? '/productos?sneakers' : `/productos?brand=${e.slug}`,
      imageUrl: imgs?.[0]?.url ?? null,
    };
  });

  return { products, curated, brandTiles };
}

export default async function HomePage() {
  const { products, curated, brandTiles } = await getHomeData();

  return (
    <div className="bg-white">
      {/* Hero — solo texto + CTAs */}
      <HeroSection />

      {/* Nuevos ingresos en carrusel — productos al toque de entrar */}
      <NewArrivalsCarousel products={products} curated={curated} />

      {/* Comprá por marca — grilla editorial configurable desde el admin */}
      <BrandGrid tiles={brandTiles} />

      {/* Trust strip */}
      <SocialProofStrip />

      {/* Clue sorteo */}
      <div className="flex justify-center py-1 bg-white">
        <GiveawayInlinePriceClue clueId="/" label="Inicio" position={0} digit="2" />
      </div>

      {/* Opiniones de clientes */}
      <Reviews />

      {/* Cómo comprar — último bloque antes del footer */}
      <HowToBuy />
    </div>
  );
}
