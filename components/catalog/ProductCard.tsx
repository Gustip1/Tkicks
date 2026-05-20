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

  const priceInArs  = Number(product.price) * dolarOficial;
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
      className="group block rounded-2xl bg-white overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-2xl hover:shadow-black/10 transition-all duration-300"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setIndex(0); }}
    >
      {/* ── Imagen ── */}
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-50">
        {!loaded && <div className="absolute inset-0 bg-gray-100 animate-pulse" />}

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
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-gray-900 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
              Agotado
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.on_sale && !isSoldOut && (
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
              <span key={idx} className={cn('h-1 rounded-full transition-all bg-gray-400', index === idx ? 'w-4 bg-gray-700' : 'w-1')} />
            ))}
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="p-3 md:p-4">
        {/* Categoría */}
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1 capitalize">
          {categoryLabel}
        </p>

        {/* Título */}
        <h3 className={cn(
          'font-bold text-gray-900 leading-snug line-clamp-2 mb-2 group-hover:text-black transition-colors',
          size === 'large' ? 'text-base' : 'text-sm',
        )}>
          {product.title}
        </h3>

        {/* Tallas */}
        {availableSizes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {availableSizes.slice(0, 5).map(s => (
              <span key={s} className="px-1.5 py-0.5 text-[9px] font-bold text-gray-500 border border-gray-200 rounded">
                {s}
              </span>
            ))}
            {availableSizes.length > 5 && (
              <span className="text-[9px] text-gray-400 font-bold self-center">+{availableSizes.length - 5}</span>
            )}
          </div>
        )}

        {/* Precios */}
        <div className="space-y-0.5">
          <p className={cn('font-black text-gray-900', size === 'large' ? 'text-xl' : 'text-lg')}>
            {formatCurrency(priceInArs)}
          </p>
          <p className="text-xs text-gray-400">${Number(product.price).toFixed(0)} USD · Transf./Efectivo</p>
          {!isSoldOut && (
            <p className={cn('text-xs font-semibold', promoOn ? 'text-orange-500' : 'text-violet-500')}>
              3 cuotas de {formatCurrency(cardArs / 3)}
              {promoOn && <span className="ml-1 text-[10px] opacity-80">sin recargo</span>}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
