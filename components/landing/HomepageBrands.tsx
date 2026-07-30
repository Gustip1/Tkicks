import { Product } from '@/types/db';
import { BrandShowcase } from './BrandShowcase';

export type HomeBrandEntry = {
  id: string;
  kind: 'brand' | 'sneakers';
  slug?: string;
  title: string;
  eyebrow?: string;
};

// Configuración por defecto si el admin todavía no eligió nada
export const DEFAULT_HOME_BRAND_ENTRIES: HomeBrandEntry[] = [
  { id: 'emestudios', kind: 'brand', slug: 'emestudios', title: 'Eme Studios', eyebrow: 'Marca destacada' },
  { id: 'scuffers', kind: 'brand', slug: 'scuffers', title: 'Scuffers', eyebrow: 'Marca destacada' },
  { id: 'valley', kind: 'brand', slug: 'valley', title: 'Valley', eyebrow: 'Vale Forever' },
  { id: 'mixedemotion', kind: 'brand', slug: 'mixedemotion', title: 'Mixed Emotion', eyebrow: 'Marca destacada' },
  { id: 'sneakers', kind: 'sneakers', title: 'Sneakers', eyebrow: 'Calzado' },
];

/**
 * Server component: recibe las entradas y los productos de cada carrusel ya
 * resueltos por app/page.tsx en un puñado de queries — así cada carrusel de
 * marca no dispara su propio round-trip a Supabase en el cliente.
 */
export function HomepageBrands({
  entries,
  productsByEntry,
}: {
  entries: HomeBrandEntry[];
  productsByEntry: Record<string, Product[]>;
}) {
  return (
    <>
      {entries.map((e) =>
        e.kind === 'sneakers' ? (
          <BrandShowcase
            key={e.id}
            title={e.title || 'Sneakers'}
            eyebrow={e.eyebrow}
            category="sneakers"
            href="/productos?sneakers"
            initialProducts={productsByEntry[e.id] ?? []}
          />
        ) : (
          <BrandShowcase
            key={e.id}
            title={e.title}
            eyebrow={e.eyebrow}
            brandSlug={e.slug}
            href={`/productos?brand=${e.slug}`}
            initialProducts={productsByEntry[e.id] ?? []}
          />
        )
      )}
    </>
  );
}
