"use client";

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { BrandShowcase } from './BrandShowcase';

export type HomeBrandEntry = {
  id: string;
  kind: 'brand' | 'sneakers';
  slug?: string;
  title: string;
  eyebrow?: string;
};

// Configuración por defecto si el admin todavía no eligió nada
const DEFAULT_ENTRIES: HomeBrandEntry[] = [
  { id: 'emestudios', kind: 'brand', slug: 'emestudios', title: 'Eme Studios', eyebrow: 'Marca destacada' },
  { id: 'scuffers', kind: 'brand', slug: 'scuffers', title: 'Scuffers', eyebrow: 'Marca destacada' },
  { id: 'valley', kind: 'brand', slug: 'valley', title: 'Valley', eyebrow: 'Vale Forever' },
  { id: 'mixedemotion', kind: 'brand', slug: 'mixedemotion', title: 'Mixed Emotion', eyebrow: 'Marca destacada' },
  { id: 'sneakers', kind: 'sneakers', title: 'Sneakers', eyebrow: 'Calzado' },
];

export function HomepageBrands() {
  const [entries, setEntries] = useState<HomeBrandEntry[] | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'homepage_brands')
        .maybeSingle();

      if (!active) return;
      const cfg = data?.value as HomeBrandEntry[] | null;
      setEntries(Array.isArray(cfg) && cfg.length > 0 ? cfg : DEFAULT_ENTRIES);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Mientras carga, usamos el default para no dejar la home vacía
  const list = entries ?? DEFAULT_ENTRIES;

  return (
    <>
      {list.map((e) =>
        e.kind === 'sneakers' ? (
          <BrandShowcase
            key={e.id}
            title={e.title || 'Sneakers'}
            eyebrow={e.eyebrow}
            category="sneakers"
            href="/productos?sneakers"
          />
        ) : (
          <BrandShowcase
            key={e.id}
            title={e.title}
            eyebrow={e.eyebrow}
            brandSlug={e.slug}
            href={`/productos?brand=${e.slug}`}
          />
        )
      )}
    </>
  );
}
