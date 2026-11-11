"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { Product, subcategoryLabel } from '@/types/db';
import { formatCurrency, cn } from '@/lib/utils';
import { Ars, useDolarRate } from '@/components/DolarRateProvider';
import { useInstallmentsPromo } from '@/components/InstallmentsPromoProvider';
import { useComingSoon } from '@/components/ComingSoonProvider';
import { getCardPriceMultiplier } from '@/lib/promo';
import { trackEvent } from '@/lib/analytics/track';

interface ProductCardProps {
  product: Product;
  size?: 'normal' | 'large';
  /** Foto que se ve apenas abre la página: se pide primero */
  priority?: boolean;
}

type InfoPopover = 'usd' | 'installments' | null;

export function ProductCard({ product, size = 'normal', priority = false }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  // La segunda foto se pide recién al pasar el mouse: en el celular nunca se ve y
  // cada tarjeta la bajaba igual, el doble de datos para el 93% de las visitas.
  const [wantsSecondary, setWantsSecondary] = useState(false);
  const [secondaryReady, setSecondaryReady] = useState(false);
  const [activeInfo, setActiveInfo] = useState<InfoPopover>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!activeInfo) return;
    const handleOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setActiveInfo(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [activeInfo]);
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

  // En escritorio la tarjeta mide unos 320px: con la miniatura de 640 se ve nítida
  // en pantallas 2x y la portada baja de 4 MB. La grilla grande sí usa la original.
  const imageSizes = size === 'large'
    ? '(max-width: 768px) 50vw, 33vw'
    : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, min(25vw, 320px)';

  const categoryLabel =
    product.category === 'streetwear' && product.subcategory
      ? subcategoryLabel(product.subcategory)
      : product.category;

  return (
    <Link
      ref={cardRef}
      href={`/producto/${product.slug}`}
      // Sin precarga al aparecer en pantalla: la ficha se genera en cada visita, así que
      // eran 15-21 llamadas al servidor por página que devolvían unos 200 bytes sin datos.
      prefetch={false}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setWantsSecondary(true); }}
      onClick={() => trackEvent('product_card_click', 'discovery', { slug: product.slug })}
      className="group store-card flex flex-col h-full"
    >
      {/* ── Imagen (swap en hover): marco gris sobre blanco, blanco sobre la franja gris (store-media) ── */}
      <div className="store-media relative w-full aspect-square overflow-hidden">
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
            sizes={imageSizes}
            priority={priority}
            className={cn(
              // Visible desde el principio: el marco gris es el lugar mientras carga.
              // Antes quedaba oculta hasta que corría el JS (lo que prohíbe CLAUDE.md).
              'object-contain mix-blend-multiply transition duration-700 ease-out',
              // al pasar el mouse la primaria se desvanece, una vez que la segunda ya cargó
              secondaryReady && 'group-hover:opacity-0',
              'group-hover:scale-[1.03]',
            )}
            onError={() => setImgError(true)}
          />
        )}

        {/* Imagen secundaria: aparece con crossfade suave al hacer hover */}
        {secondary?.url && wantsSecondary && (
          <Image
            src={secondary.url}
            alt={secondary.alt || product.title}
            fill
            sizes={imageSizes}
            onLoad={() => setSecondaryReady(true)}
            className={cn(
              'object-contain mix-blend-multiply opacity-0 scale-[1.03] transition duration-700 ease-out',
              secondaryReady && 'group-hover:opacity-100 group-hover:scale-100',
            )}
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
        {/* Eyebrow de apple.com: "Nuevo" en Launch Orange, texto solo; si no, la categoría en gris */}
        {comingSoon ? (
          <p className="t-fine font-semibold text-[#b64400] mb-1">
            Próximo ingreso{comingSoonEta && ` · ${comingSoonEta}`}
          </p>
        ) : hasSale && !isSoldOut ? (
          <p className="t-fine font-semibold text-red-600 mb-1">Oferta</p>
        ) : product.is_new && !isSoldOut ? (
          <p className="t-fine font-semibold text-[#b64400] mb-1">Nuevo</p>
        ) : (
          <p className="t-fine text-gray-500 mb-1 capitalize">{categoryLabel}</p>
        )}

        <h3 className={cn(
          'font-semibold text-gray-900 leading-snug line-clamp-2 mb-1.5 sm:mb-2 tracking-[-0.022em]',
          size === 'large' ? 'text-[15px] sm:text-[19px]' : 'text-[14px] sm:text-[17px]',
        )}>
          {product.title}
        </h3>

        {/* El talle a la vista, también en el celular: quien llega del anuncio sabe
            sin entrar si hay el suyo. Casi todo es única unidad, así que va como
            dato y no como sello sobre la foto (estaría en casi todas). */}
        {availableSizes.length > 0 && (
          <p className="mb-1.5 sm:mb-2 text-[12px] sm:text-[13px] text-gray-600 tabular-nums">
            {availableSizes.length === 1 ? 'Talle' : 'Talles'} {availableSizes.slice(0, 4).join(', ')}
            {availableSizes.length > 4 && ` +${availableSizes.length - 4}`}
            {totalStock === 1 && ' · Última unidad'}
          </p>
        )}

        <div className="space-y-0.5 mt-auto">
          {/* USD — precio principal */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={cn(
              't-strong text-[15px] sm:text-[17px]',
              hasSale ? 'text-red-600' : 'text-gray-900',
            )}>
              ${activePrice.toFixed(2)}
              <span className="text-xs text-gray-500 font-normal ml-0.5 align-top">USD</span>
            </span>
            {hasSale && (
              <span className="text-xs text-gray-400 line-through font-normal">
                ${Number(product.price).toFixed(2)}
              </span>
            )}
          </div>

          {/* ARS — mismo tamaño que el USD */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={cn(
              't-body text-[13px] sm:text-[17px]',
              hasSale ? 'text-red-600' : 'text-gray-700',
            )}>
              <Ars>{formatCurrency(priceInArs)}</Ars>
            </span>
            {hasSale && (
              <span className="hidden sm:inline text-xs text-gray-400 line-through font-normal">
                <Ars>{formatCurrency(Number(product.price) * dolarOficial)}</Ars>
              </span>
            )}
          </div>

          {/* Aclaración: precios en USD, conversión a cambio oficial */}
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveInfo((v) => (v === 'usd' ? null : 'usd'));
              }}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-primary font-normal hover:text-primary-hover transition-colors"
            >
              <Info className="w-3 h-3" />
              Precios en USD
            </button>
            {activeInfo === 'usd' && (
              <div className="mt-1 w-full rounded-sm bg-gray-900 text-white text-xs leading-snug p-2.5">
                Todos los precios están expresados en USD. Las conversiones a pesos son al cambio oficial.
              </div>
            )}
          </div>

          {/* Tarjeta 3 cuotas — clickeable, comparte la aclaración con el de arriba */}
          {!isSoldOut && (
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveInfo((v) => (v === 'installments' ? null : 'installments'));
                }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  promoOn ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700',
                )}
              >
                <Ars>3 × {formatCurrency(cardArs / 3)}</Ars>
                <span className="hidden sm:inline font-normal opacity-70">
                  {promoOn ? 'sin recargo' : 'c/ 10% recargo'}
                </span>
              </button>
              {activeInfo === 'installments' && (
                <div className="mt-1 w-full rounded-sm bg-gray-900 text-white text-xs leading-snug p-2.5">
                  {promoOn
                    ? 'Promo activa: 3 cuotas sin interés, al mismo precio que efectivo/transferencia.'
                    : 'Pagando en 3 cuotas con tarjeta se aplica un 10% de recargo sobre el precio base.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
