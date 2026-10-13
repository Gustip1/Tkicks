"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Product } from '@/types/db';
import { formatARS, cn } from '@/lib/utils';
import { useDolarRate } from '@/components/DolarRateProvider';
import { useInstallmentsPromo } from '@/components/InstallmentsPromoProvider';
import { useComingSoon } from '@/components/ComingSoonProvider';
import { getCardPriceMultiplier } from '@/lib/promo';
import { trackEvent } from '@/lib/analytics/track';

interface ProductCardProps {
  product: Product;
  size?: 'normal' | 'large';
}

export function ProductCard({ product, size = 'normal' }: ProductCardProps) {
  const [loaded, setLoaded]     = useState(false);
  const [imgError, setImgError] = useState(false);
  const images                  = product.images || [];
  const primary                 = images[0];
  const secondary               = images[1]; // imagen para el swap en hover (estilo Shopify)
  const { rate: dolarOficial }  = useDolarRate();
  const { active: promoOn }     = useInstallmentsPromo();
  // Marcado como próximo ingreso desde /admin/proximos (con fecha estimada opcional)
  const { isComingSoon: comingSoon, eta: comingSoonEta } = useComingSoon(product.id);

  const totalStock = useMemo(() => {
    // undefined = no se pidieron variantes en este query (no hay dato, no asumimos agotado).
    // [] = se pidieron y no hay ninguna: el producto está realmente sin stock.
    if (product.product_variants === undefined) return null;
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

  const hasSale     = product.sale_price != null && Number(product.sale_price) > 0;
  const activePrice = hasSale ? Number(product.sale_price) : Number(product.price);
  const priceInArs  = activePrice * dolarOficial;
  const cardMult    = getCardPriceMultiplier(promoOn);
  const cardArs     = priceInArs * cardMult;

  const categoryLabel =
    product.category === 'streetwear' && product.subcategory
      ? `${product.subcategory}`
      : product.category;

  return (
    <Link
      href={`/producto/${product.slug}`}
      onClick={() => trackEvent('product_card_click', 'discovery', { slug: product.slug })}
      className="group store-card flex flex-col h-full p-2.5 sm:p-4 md:p-5"
    >
      {/* ── Imagen (swap en hover) — dentro de la tarjeta, esquinas de 8px ── */}
      <div className="relative w-full aspect-square overflow-hidden rounded-sm bg-parchment">
        {/* El esqueleto solo pulsa mientras hay una imagen real cargando; si no
            hay imagen o falló, no queda pulsando para siempre. */}
        {!!primary?.url && !imgError && !loaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}

        {(!primary?.url || imgError) && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 sm:w-8 sm:h-8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        {primary?.url && !imgError && (
          <Image
            src={primary.url}
            alt={primary.alt || product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            quality={85}
            className={cn(
              'object-contain mix-blend-multiply transition duration-700 ease-out',
              loaded ? 'opacity-100' : 'opacity-0',
              // al pasar el mouse la primaria se desvanece si hay una segunda imagen
              secondary?.url && 'group-hover:opacity-0',
              'group-hover:scale-[1.03]',
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}

        {/* Imagen secundaria: aparece con crossfade suave al hacer hover */}
        {secondary?.url && (
          <Image
            src={secondary.url}
            alt={secondary.alt || product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            quality={85}
            className="object-contain mix-blend-multiply opacity-0 scale-[1.03] transition duration-700 ease-out group-hover:opacity-100 group-hover:scale-100"
          />
        )}

        {/* Sold-out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="rounded-full bg-gray-900 text-white text-xs font-semibold px-3 py-1">
              Agotado
            </span>
          </div>
        )}


      </div>

      {/* ── Info ── */}
      <div className="pt-2.5 sm:pt-4 flex-1 flex flex-col">
        {/* Eyebrow de apple.com: "Nuevo" en naranja; si no, la categoría en gris */}
        {comingSoon ? (
          <p className="t-fine font-semibold text-[#bf4800] mb-1">
            Próximo ingreso{comingSoonEta && ` · ${comingSoonEta}`}
          </p>
        ) : hasSale && !isSoldOut ? (
          <p className="t-fine font-semibold text-red-600 mb-1">Oferta</p>
        ) : product.is_new && !isSoldOut ? (
          <p className="t-fine font-semibold text-[#bf4800] mb-1">Nuevo</p>
        ) : (
          <p className="t-fine text-gray-500 mb-1 capitalize">{categoryLabel}</p>
        )}

        <h3 className={cn(
          'font-semibold text-gray-900 leading-snug line-clamp-2 mb-1.5 sm:mb-2 tracking-[-0.022em]',
          size === 'large' ? 'text-[15px] sm:text-[19px]' : 'text-[14px] sm:text-[17px]',
        )}>
          {product.title}
        </h3>

        {/* Talles disponibles: en celular en una línea de texto, para saber
            antes de abrir si está el tuyo */}
        {availableSizes.length > 0 && !isSoldOut && (
          <p className="mb-1.5 truncate text-[12px] sm:text-[13px] text-gray-500">
            {availableSizes.length === 1 ? 'Talle ' : 'Talles '}
            {availableSizes.slice(0, 6).join(' · ')}
            {availableSizes.length > 6 && ` +${availableSizes.length - 6}`}
          </p>
        )}

        {/* Precio en pesos primero: la gente de Instagram piensa en pesos.
            El USD y las cuotas quedan en una línea chica de referencia. */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={cn(
              'text-[16px] sm:text-[19px] font-semibold tracking-[-0.02em] tabular-nums',
              hasSale ? 'text-red-600' : 'text-gray-900',
            )}>
              {formatARS(priceInArs)}
            </span>
            {hasSale && (
              <span className="text-[12px] text-gray-400 line-through tabular-nums">
                {formatARS(Number(product.price) * dolarOficial)}
              </span>
            )}
          </div>
          {!isSoldOut && (
            <p className={cn('mt-0.5 text-[12px] sm:text-[13px] leading-snug tabular-nums', promoOn ? 'text-red-600' : 'text-gray-500')}>
              3 × {formatARS(cardArs / 3)}{promoOn && ' sin interés'}
            </p>
          )}
          <p className="hidden sm:block mt-0.5 text-[12px] text-gray-400 tabular-nums">USD {activePrice.toFixed(0)}</p>
        </div>
      </div>
    </Link>
  );
}
