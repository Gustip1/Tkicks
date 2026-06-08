"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Product } from '@/types/db';
import { formatCurrency, cn } from '@/lib/utils';
import { useDolarRate } from '@/components/DolarRateProvider';
import { getCardPriceMultiplier, isPromoActive } from '@/lib/promo';

interface ProductCardProps {
  product: Product;
  size?: 'normal' | 'large';
}

export function ProductCard({ product, size = 'normal' }: ProductCardProps) {
  const [index, setIndex]       = useState(0);
  const [hovering, setHovering] = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const images                  = product.images || [];
  const { rate: dolarOficial }  = useDolarRate();

  const totalStock = useMemo(() => {
    if (!product.product_variants?.length) return null;
    return product.product_variants.reduce((s, v) => s + (v.stock ?? 0), 0);
  }, [product.product_variants]);

  const isSoldOut = totalStock !== null && totalStock <= 0;

  const availableSizes = useMemo(() => {
    if (!product.product_variants) return [];
    return product.product_variants
      .filter(v => (v.stock ?? 0) > 0)
      .map(v => v.size)
      .filter(Boolean) as string[];
  }, [product.product_variants]);

  useEffect(() => {
    if (!hovering || images.length <= 1) return;
    const t = window.setInterval(() => setIndex(i => (i + 1) % images.length), 800);
    return () => window.clearInterval(t);
  }, [hovering, images.length]);

  const hasSale     = product.sale_price != null && Number(product.sale_price) > 0;
  const activePrice = hasSale ? Number(product.sale_price) : Number(product.price);
  const priceInArs  = activePrice * dolarOficial;
  const cardMult    = getCardPriceMultiplier();
  const cardArs     = priceInArs * cardMult;
  const promoOn     = isPromoActive();

  const categoryLabel =
    product.category === 'streetwear' && product.subcategory
      ? `${product.subcategory}`
      : product.category;

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group block"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setIndex(0); }}
    >
      {/* ── Imagen ── */}
      <div className="relative w-full aspect-square overflow-hidden">
        {!loaded && <div className="absolute inset-0 bg-zinc-900 animate-pulse rounded-sm" />}

        {images[index]?.url && (
          <Image
            src={images[index].url}
            alt={images[index].alt || product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            quality={85}
            className={cn(
              'object-contain transition-opacity duration-500',
              loaded ? 'opacity-100' : 'opacity-0',
              hovering && images.length > 1 && 'opacity-90',
            )}
            onLoad={() => setLoaded(true)}
          />
        )}

        {/* Sold-out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-black text-[10px] font-black px-3 py-1 uppercase tracking-widest">
              Agotado
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {(hasSale || product.on_sale) && !isSoldOut && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest">
              SALE
            </span>
          )}
          {product.is_new && !isSoldOut && (
            <span className="px-2 py-0.5 bg-white text-black text-[9px] font-black uppercase tracking-widest">
              Nuevo
            </span>
          )}
        </div>

        {/* Indicadores de imagen */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, idx) => (
              <span key={idx} className={cn('h-0.5 rounded-full transition-all bg-white/30', index === idx ? 'w-4 bg-white/70' : 'w-1')} />
            ))}
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="pt-3">
        {/* Categoría */}
        <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold mb-1">
          {categoryLabel}
        </p>

        {/* Título */}
        <h3 className={cn(
          'font-bold text-white uppercase tracking-wide leading-tight line-clamp-2 mb-2 group-hover:text-white/70 transition-colors',
          size === 'large' ? 'text-sm' : 'text-xs',
        )}>
          {product.title}
        </h3>

        {/* Tallas */}
        {availableSizes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {availableSizes.slice(0, 4).map(s => (
              <span key={s} className="text-[9px] font-bold text-white/40 border border-white/10 px-1.5 py-0.5">
                {s}
              </span>
            ))}
            {availableSizes.length > 4 && (
              <span className="text-[9px] text-white/30 font-bold self-center">+{availableSizes.length - 4}</span>
            )}
          </div>
        )}

        {/* Precios */}
        <div className="space-y-0.5">
          {hasSale && (
            <p className="text-[10px] text-white/30 line-through">
              ${Number(product.price).toFixed(2)} USD
            </p>
          )}
          <p className={cn(
            'font-bold tracking-wide',
            size === 'large' ? 'text-base' : 'text-sm',
            hasSale ? 'text-red-400' : 'text-white',
          )}>
            ${activePrice.toFixed(2)} USD
          </p>
          <p className="text-[10px] text-white/30">{formatCurrency(priceInArs)}</p>
          {!isSoldOut && (
            <p className={cn('text-[10px] font-medium', promoOn ? 'text-orange-400/70' : 'text-violet-400/70')}>
              3 × {formatCurrency(cardArs / 3)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
