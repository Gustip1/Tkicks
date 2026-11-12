"use client";
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useFavoriteIds, useFavoritesStore } from '@/store/favorites';
import { trackEvent } from '@/lib/analytics/track';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

/** Corazón para guardar un producto en favoritos (este dispositivo) */
export function FavoriteButton({
  productId,
  slug,
  title,
  className,
}: {
  productId: string;
  slug: string;
  title: string;
  className?: string;
}) {
  const saved = useFavoriteIds().includes(productId);
  const toggle = useFavoritesStore((s) => s.toggle);
  // El corazón se anima solo cuando lo acaban de tocar, no al cargar la página
  const [justSaved, setJustSaved] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Quitar ${title} de favoritos` : `Guardar ${title} en favoritos`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowSaved = toggle(productId);
        setJustSaved(nowSaved);
        haptic();
        // Solo el guardado cuenta para "los más guardados de la semana"
        if (nowSaved) trackEvent('favorite_added', 'discovery', { slug, product_id: productId });
      }}
      className={cn('card-action', className)}
    >
      <Heart
        className={cn('h-[18px] w-[18px]', saved && 'fill-current', saved && justSaved && 'heart-pop')}
        strokeWidth={saved ? 0 : 1.8}
        aria-hidden
      />
    </button>
  );
}
