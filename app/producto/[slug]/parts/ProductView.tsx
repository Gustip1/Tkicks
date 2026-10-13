"use client";
import Link from 'next/link';
import { Product, ProductVariant } from '@/types/db';
import { formatARS, cn } from '@/lib/utils';
import { AddToCart } from './AddToCart';
import { MakeOffer } from './MakeOffer';
import { BuyBar } from './BuyBar';
import { RelatedProducts } from './RelatedProducts';
import { ImageCarousel } from '@/components/pdp/ImageCarousel';
import { useDolarRate } from '@/components/DolarRateProvider';
import { useInstallmentsPromo } from '@/components/InstallmentsPromoProvider';
import { useComingSoon } from '@/components/ComingSoonProvider';
import { GiveawayInlinePriceClue, getProductClueInfo } from '@/components/giveaway/GiveawayClue';
import { Shield, Truck, Banknote, CreditCard } from 'lucide-react';
import { getCardPriceMultiplier } from '@/lib/promo';

/**
 * Ficha de producto (parte interactiva). Los datos llegan resueltos desde el
 * servidor (page.tsx): el producto se ve en el primer render, sin esqueleto
 * ni un segundo viaje a la base desde el celular.
 */
export function ProductView({
  product,
  variants,
  offersEnabled,
}: {
  product: Product;
  variants: ProductVariant[];
  offersEnabled: boolean;
}) {
  const { rate: dolarOficial } = useDolarRate();
  const { active: promoOn } = useInstallmentsPromo();
  const { isComingSoon: comingSoonFlag, eta: comingSoonEta } = useComingSoon(product.id);

  const hasSale    = product.sale_price != null && Number(product.sale_price) > 0;
  const activePrice = hasSale ? Number(product.sale_price) : Number(product.price);
  const priceInArs = activePrice * dolarOficial;
  const productClueInfo = getProductClueInfo(product.slug, product.category);
  const isComingSoon = comingSoonFlag;

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn bg-white min-h-screen overflow-x-hidden pb-24">
      {/* Breadcrumb */}
      <nav className="mb-4 md:mb-6 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-400 font-bold" aria-label="Ruta de navegación">
        <Link href="/" className="hover:text-gray-900 transition-colors">Inicio</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/productos?${product.category}`} className="hover:text-gray-900 transition-colors capitalize">
          {product.category}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-gray-900 font-black truncate max-w-[120px] md:max-w-[200px]" aria-current="page">{product.title}</span>
      </nav>

      <div className="grid gap-3 md:gap-8 lg:gap-16 md:grid-cols-2">
        {/* Image section */}
        <div className="md:sticky md:top-20 md:self-start">
          <ImageCarousel images={product.images || []} />
        </div>
        
        {/* Product info section */}
        <div className="space-y-3 md:space-y-6">
          {/* Eyebrow + título, como la página "Comprar" de apple.com */}
          <div className="hero-rise">
            {isComingSoon ? (
              <p className="t-caption font-semibold text-[#bf4800]">
                Próximo ingreso{comingSoonEta && ` · ${comingSoonEta}`}
              </p>
            ) : hasSale ? (
              <p className="t-caption font-semibold text-red-600">Oferta</p>
            ) : product.is_new ? (
              <p className="t-caption font-semibold text-[#bf4800]">Nuevo</p>
            ) : (
              <p className="t-caption text-gray-500 capitalize">{product.category}</p>
            )}
            <h1 className="t-display mt-1.5">{product.title}</h1>
          </div>

          {/* Description */}
          {product.description && (
            <p className="t-body text-gray-600 whitespace-pre-wrap">
              {product.description}
            </p>
          )}

          {/* Price */}
          {(() => {
            const cardPriceArs = activePrice * getCardPriceMultiplier(promoOn) * dolarOficial;
            const installment = cardPriceArs / 3;
            const discountPct = hasSale
              ? Math.round((1 - activePrice / Number(product.price)) * 100)
              : 0;

            return (
              <div className="space-y-4 pb-4 md:pb-6 border-b border-gray-200">
                {/* Precio en pesos arriba de todo (transferencia/efectivo, el mejor),
                    cuotas en una línea y el USD como referencia. Antes eran dos
                    tarjetas grandes que empujaban los talles fuera de la pantalla. */}
                <div>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className={cn('text-[32px] md:text-[40px] leading-none font-semibold tracking-[-0.02em] tabular-nums', hasSale ? 'text-red-600' : 'text-gray-900')}>
                      {formatARS(priceInArs)}
                    </span>
                    {hasSale && discountPct > 0 && (
                      <span className="t-caption font-semibold text-red-600">-{discountPct}%</span>
                    )}
                    {productClueInfo && (
                      <GiveawayInlinePriceClue
                        clueId={`producto:${product.slug}`}
                        label={`Producto: ${product.title}`}
                        position={productClueInfo.position}
                        digit={productClueInfo.digit}
                      />
                    )}
                  </div>
                  <p className="mt-2 t-caption text-gray-600">
                    Transferencia o efectivo
                    {hasSale && (
                      <> · antes <span className="line-through">{formatARS(Number(product.price) * dolarOficial)}</span></>
                    )}
                  </p>
                  <p className={cn('mt-1 t-caption', promoOn ? 'text-red-600' : 'text-gray-600')}>
                    <CreditCard className="inline h-3.5 w-3.5 -mt-0.5 mr-1" aria-hidden />
                    3 × {formatARS(installment)} con tarjeta
                    {promoOn ? ' · sin interés' : ` · total ${formatARS(cardPriceArs)}`}
                  </p>
                  <p className="mt-1 t-caption text-gray-400 tabular-nums">
                    USD {activePrice.toFixed(0)}
                    {hasSale && <> · antes USD {Number(product.price).toFixed(0)}</>}
                  </p>
                </div>

                <p className="text-[11px] text-gray-400">
                  Pesos al dólar oficial del día. El valor en USD es de referencia.
                </p>
              </div>
            );
          })()}

          {/* Aviso de compra anticipada — producto en camino al showroom */}
          {isComingSoon && (
            <div className="flex items-start gap-3 rounded-lg bg-gray-100 p-5">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-gray-900" aria-hidden />
              <div>
                <p className="text-sm font-black text-gray-900 ">
                  En camino al showroom{comingSoonEta && ` · Llega ${comingSoonEta}`}
                </p>
                <p className="text-xs md:text-sm text-gray-600 font-bold mt-0.5">
                  Este producto todavía no llegó{comingSoonEta ? `, lo esperamos ${comingSoonEta}` : ''}.
                  Podés comprarlo ahora de forma anticipada y te avisamos apenas esté disponible
                  para retiro o envío.
                </p>
              </div>
            </div>
          )}

          {/* Add to cart section */}
          <div id="comprar-section" className="py-2 md:py-4 scroll-mt-24">
            <AddToCart product={product} variants={variants} />
          </div>

          {/* Hacer una oferta — la alternativa, después de la compra directa. Se activa desde /admin/ajustes */}
          {offersEnabled && <MakeOffer productTitle={product.title} productSlug={product.slug} />}

          {/* Por qué comprar acá — textos exactos: las cuotas dependen de la promo vigente */}
          <ul className="grid grid-cols-2 gap-2.5 pt-2">
            {[
              { Icon: Shield, title: '100% original', sub: 'Con comprobante de compra' },
              { Icon: Truck, title: 'Envíos a todo el país', sub: 'Con seguimiento' },
              { Icon: CreditCard, title: '3 cuotas con tarjeta', sub: promoOn ? 'Sin recargo (promo)' : 'Con 10% de recargo' },
              { Icon: Banknote, title: 'Mejor precio', sub: 'Transferencia o efectivo' },
            ].map(({ Icon, title, sub }) => (
              <li key={title} className="flex items-start gap-2.5 rounded-lg bg-gray-100 p-3.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight text-gray-900">{title}</p>
                  <p className="mt-0.5 text-[12px] leading-tight text-gray-500">{sub}</p>
                </div>
              </li>
            ))}
          </ul>
          
        </div>
      </div>

      {/* Productos relacionados: evita que la ficha sea un callejón sin salida */}
      <RelatedProducts productId={product.id} category={product.category} brand={product.brand} />

      {/* Barra de compra fija — mobile y desktop, se oculta cuando la sección de compra está a la vista */}
      <BuyBar
        product={product}
        variants={variants}
        priceUsd={activePrice}
        priceArs={priceInArs}
        targetId="comprar-section"
      />
    </div>
  );
}
