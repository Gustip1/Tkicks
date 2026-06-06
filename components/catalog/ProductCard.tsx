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
      ? `Streetwear · ${product.subcategory}`
      : product.category === 'sneakers'
      ? 'Sneakers'
      : product.category;

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group block rounded-2xl bg-zinc-900 overflow-hidden border border-white/8 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40 transition-all duration-300"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setIndex(0); }}
    >
      {/* ── Imagen ── */}
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-zinc-800">
        {!loaded && <div className="absolute inset-0 bg-zinc-800 animate-pulse" />}

        {images[index]?.url && (
          <Image
            src={images[index].url}
            alt={images[index].alt || product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            quality={80}
            className={cn(
              'object-cover transition-all duration-500',
              loaded ? 'opacity-100' : 'opacity-0',
              hovering && 'scale-105',
            )}
            onLoad={() => setLoaded(true)}
          />
        )}

        {/* Sold-out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="bg-white text-black text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
              Agotado
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {(hasSale || product.on_sale) && !isSoldOut && (
            <span className="px-2.5 py-0.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-wide rounded-full shadow-sm">
              SALE
            </span>
          )}
          {product.is_new && !isSoldOut && (
            <span className="px-2.5 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wide rounded-full shadow-sm">
              Nuevo
            </span>
          )}
        </div>

        {/* Indicadores de imagen */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, idx) => (
              <span key={idx} className={cn('h-1 rounded-full transition-all bg-white/40', index === idx ? 'w-4 bg-white' : 'w-1')} />
            ))}
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="p-3 md:p-4">
        {/* Categoría */}
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1 capitalize">
          {categoryLabel}
        </p>

        {/* Título */}
        <h3 className={cn(
          'font-bold text-white leading-snug line-clamp-2 mb-2 group-hover:text-white/90 transition-colors',
          size === 'large' ? 'text-base' : 'text-sm',
        )}>
          {product.title}
        </h3>

        {/* Tallas */}
        {availableSizes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {availableSizes.slice(0, 5).map(s => (
              <span key={s} className="px-1.5 py-0.5 text-[9px] font-bold text-white/60 border border-white/15 rounded">
                {s}
              </span>
            ))}
            {availableSizes.length > 5 && (
              <span className="text-[9px] text-white/40 font-bold self-center">+{availableSizes.length - 5}</span>
            )}
          </div>
        )}

        {/* Precios */}
        <div className="space-y-0.5">
          {hasSale && (
            <p className="text-xs text-white/40 line-through">
              ${Number(product.price).toFixed(0)} USD
            </p>
          )}
          <p className={cn('font-black', size === 'large' ? 'text-xl' : 'text-lg', hasSale ? 'text-red-400' : 'text-white')}>
            ${activePrice.toFixed(0)} USD
          </p>
          <p className="text-xs text-white/40">{formatCurrency(priceInArs)} · Transf./Efectivo</p>
          {!isSoldOut && (
            <p className={cn('text-xs font-semibold', promoOn ? 'text-orange-400' : 'text-violet-400')}>
              3 cuotas de {formatCurrency(cardArs / 3)}
              {promoOn && <span className="ml-1 text-[10px] opacity-80">sin recargo</span>}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
