import { createClient } from '@supabase/supabase-js';
import { Product } from '@/types/db';
import { HeroSection } from '@/components/landing/HeroSection';
import { NewArrivals } from '@/components/landing/NewArrivals';
import { CategoryShowcase } from '@/components/landing/CategoryShowcase';
import { HomepageBrands } from '@/components/landing/HomepageBrands';
import { Reviews } from '@/components/landing/Reviews';
import { HowToBuy } from '@/components/landing/HowToBuy';
import { SocialProofStrip } from '@/components/landing/SocialProofStrip';
import { ElCuartitoEvent } from '@/components/promo/ElCuartitoEvent';
import { GiveawayInlinePriceClue } from '@/components/giveaway/GiveawayClue';

// ISR: la home se sirve estática y se refresca cada 5 minutos,
// así los productos aparecen en el primer render (sin skeletons).
export const revalidate = 300;

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
    .limit(8);

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
    .limit(8);

  return { products: (latest ?? []) as unknown as Product[], curated: false };
}

export default async function HomePage() {
  const { products, curated } = await getHomeProducts();

  return (
    <div className="bg-white">
      {/* Hero — solo texto + CTAs */}
      <HeroSection />

      {/* Productos al toque: nuevos ingresos (o lo último del catálogo) */}
      <NewArrivals products={products} curated={curated} />

      {/* Elegí tu estilo — categorías editoriales */}
      <CategoryShowcase />

      {/* Trust strip */}
      <SocialProofStrip />

      {/* El Cuartito × Tkicks — evento Día del Amigo (entradas via Passline) */}
      <ElCuartitoEvent />

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
