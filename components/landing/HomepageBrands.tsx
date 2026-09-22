"use client";
import { useState } from 'react';
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
 * Carruseles de marca de la home.
 *
 * Se muestran los primeros y el resto queda detrás de un botón. Según las
 * analíticas la home medía 10,4 pantallas de celular y la mitad de la gente
 * bajaba solo hasta el 27%: los últimos carruseles no los veía nadie y, peor,
 * la fila de bloques casi idénticos aburría y hacía abandonar antes. Nada se
 * pierde: se despliega en el lugar con un toque.
 */
const VISIBLE_BY_DEFAULT = 3;

export function HomepageBrands({
  entries,
  productsByEntry,
}: {
  entries: HomeBrandEntry[];
  productsByEntry: Record<string, Product[]>;
}) {
  const [expanded, setExpanded] = useState(false);

  // Solo cuentan las que realmente tienen productos para mostrar
  const withProducts = entries.filter((e) => (productsByEntry[e.id] ?? []).length > 0);
  const visible = expanded ? withProducts : withProducts.slice(0, VISIBLE_BY_DEFAULT);
  const hidden = withProducts.length - visible.length;

  const render = (e: HomeBrandEntry, i: number) =>
    e.kind === 'sneakers' ? (
      <BrandShowcase
        key={e.id}
        tone={i % 2 === 0 ? 'parchment' : 'light'}
        title={e.title || 'Sneakers'}
        eyebrow={e.eyebrow}
        category="sneakers"
        href="/productos?sneakers"
        initialProducts={productsByEntry[e.id] ?? []}
      />
    ) : (
      <BrandShowcase
        key={e.id}
        tone={i % 2 === 0 ? 'parchment' : 'light'}
        title={e.title}
        eyebrow={e.eyebrow}
        brandSlug={e.slug}
        href={`/productos?brand=${e.slug}`}
        initialProducts={productsByEntry[e.id] ?? []}
      />
    );

  return (
    <>
      {visible.map(render)}

      {hidden > 0 && (
        <div className={`bleed pb-16 md:pb-20 -mt-6 text-center ${(visible.length - 1) % 2 === 0 ? 'tile-parchment' : 'tile-light'}`}>
          <button onClick={() => setExpanded(true)} className="btn-apple-ghost">
            Ver {hidden} {hidden === 1 ? 'marca más' : 'marcas más'}
          </button>
        </div>
      )}
    </>
  );
}
