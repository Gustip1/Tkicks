"use client";
import Link from 'next/link';
import { Product, ProductVariant } from '@/types/db';
import { formatCurrency, cn } from '@/lib/utils';
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
                {/* Precio principal (USD) */}
                <div>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="t-lead text-gray-900">
                      ${activePrice.toFixed(2)}
                      <span className="t-body text-gray-500 ml-1">USD</span>
                    </span>
                    {hasSale && (
                      <span className="t-body text-gray-400 line-through">
                        ${Number(product.price).toFixed(2)}
                      </span>
                    )}
                    {hasSale && discountPct > 0 && (
                      <span className="t-caption font-semibold text-red-600">
                        -{discountPct}%
                      </span>
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
                  {hasSale && (
                    <p className="mt-1.5 t-caption text-red-600">
                      Ahorrás ${(Number(product.price) - activePrice).toFixed(0)} USD.
                    </p>
                  )}
                </div>

                {/* Métodos de pago — precios en ARS.
                    Van una debajo de otra hasta que la columna de info es
                    ancha de verdad: en tablet, con la ficha ya en dos
                    columnas, dos tarjetas lado a lado dejaban ~180px cada una
                    y el importe se cortaba a la mitad. */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {/* Transferencia / Efectivo */}
                  <div className="relative rounded-lg bg-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 shrink-0">
                        <Banknote className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-xs font-normal text-gray-600 leading-tight">
                        Transferencia<br className="hidden sm:block" /> / Efectivo
                      </p>
                    </div>
                    <p className="text-2xl md:text-[28px] font-semibold text-gray-900 tracking-tight break-words">
                      {formatCurrency(priceInArs)}
                    </p>
                    <p className="mt-1 text-xs text-gray-900 font-semibold">
                      Mejor precio
                    </p>
                  </div>

                  {/* Tarjeta — 3 cuotas */}
                  <div className={cn(
                    'relative rounded-lg border p-5',
                    promoOn ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white',
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
                        promoOn ? 'bg-red-600' : 'bg-gray-100',
                      )}>
                        <CreditCard className={cn('w-4 h-4', promoOn ? 'text-white' : 'text-gray-900')} />
                      </div>
                      <p className="text-[11px] md:text-xs font-black text-gray-500 leading-tight">
                        Tarjeta<br className="hidden sm:block" /> {promoOn ? '3 cuotas sin interés' : '3 cuotas (10% de recargo)'}
                      </p>
                      {promoOn && (
                        <span className="ml-auto inline-flex self-start rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                          Promo
                        </span>
                      )}
                    </div>
                    <p className={cn('text-2xl md:text-3xl font-black tracking-tight break-words', promoOn ? 'text-red-600' : 'text-gray-900')}>
                      3 × {formatCurrency(installment)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500 font-bold">
                      {promoOn ? 'Sin recargo' : `Total ${formatCurrency(cardPriceArs)}`}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 font-medium">
                  Precios en pesos calculados al tipo de cambio actual. El valor en USD es de referencia.
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
