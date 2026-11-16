"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cart';
import { useUIStore } from '@/store/ui';
import { formatARS, cn } from '@/lib/utils';
import { useDolarRate } from '@/components/DolarRateProvider';
import { useSwipeToDismiss } from '@/lib/useSwipeToDismiss';
import { Clock, AlertTriangle, X, ShoppingBag, Minus, Plus, ArrowRight, ShieldCheck, Truck, CreditCard } from 'lucide-react';
import { useInstallmentsPromo } from '@/components/InstallmentsPromoProvider';
import { getCardPriceMultiplier } from '@/lib/promo';
import { trackEvent } from '@/lib/analytics/track';

const QUICK_PICKS = [
  { label: 'Nuevos ingresos', href: '/nuevos-ingresos' },
  { label: 'Sneakers', href: '/productos?sneakers' },
  { label: 'Remeras', href: '/productos?streetwear&sub=remeras' },
  { label: 'Hoodies', href: '/productos?streetwear&sub=hoodies' },
  { label: 'Ofertas', href: '/ofertas' },
];

export function CartDrawer() {
  const { items, updateQty, removeItem, checkExpiry, getRemainingSeconds } = useCartStore();
  const { rate: dolarOficial } = useDolarRate();
  const subtotalUSD = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const subtotalARS = subtotalUSD * dolarOficial;
  const { active: promoOn } = useInstallmentsPromo();
  // 3 cuotas con tarjeta: mismo cálculo que la ficha y el checkout
  const installmentArs = (subtotalARS * getCardPriceMultiplier(promoOn)) / 3;
  const isOpen = useUIStore((s) => s.isCartOpen);
  const close = useUIStore((s) => s.closeCart);
  const pathname = usePathname();
  // Deslizarlo hacia la derecha con el dedo lo cierra, como una hoja de iOS
  const { panelRef, backdropRef } = useSwipeToDismiss<HTMLDivElement, HTMLDivElement>(close, isOpen);

  // Al cambiar de página el carrito se cierra: si no, quedaba abierto encima
  // del checkout y tapaba el botón para continuar.
  useEffect(() => {
    close();
  }, [pathname, close]);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  // Renglones que se están cerrando antes de salir del carrito
  const [leaving, setLeaving] = useState<string[]>([]);
  const removeLine = (productId: string, size: string) => {
    const key = `${productId}-${size}`;
    if (leaving.includes(key)) return;
    setLeaving((l) => [...l, key]);
    setTimeout(() => {
      removeItem(productId, size);
      setLeaving((l) => l.filter((k) => k !== key));
    }, 240);
  };

  // Timer tick every second
  useEffect(() => {
    if (!isOpen) return;
    const tick = () => {
      if (checkExpiry()) {
        setExpired(true);
        setRemainingSeconds(0);
        return;
      }
      setRemainingSeconds(getRemainingSeconds());
      setExpired(false);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isOpen, items.length, checkExpiry, getRemainingSeconds]);

  // Clear expired state when new items are added
  useEffect(() => {
    if (items.length > 0) setExpired(false);
  }, [items.length]);

  // ESC to close + lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = remainingSeconds !== null && remainingSeconds <= 30;

  return (
    <>
      <div
        ref={backdropRef}
        aria-hidden="true"
        onClick={close}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />
      <div
        ref={panelRef}
        className={cn(
          'touch-pan-y fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-gray-200 bg-white shadow-2xl transition-transform md:w-[420px] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]',
          // Curva de los paneles de iOS (Emil): entra con cuerpo, sale rápido
          isOpen
            ? 'translate-x-0 duration-500 ease-[var(--ease-drawer)]'
            : 'translate-x-full duration-300 ease-[var(--ease-out)]'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h2 className="t-tagline text-gray-900">
              Carrito
              {items.length > 0 && (
                <span className="ml-2 text-sm font-black text-gray-400">
                  ({items.reduce((s, it) => s + it.quantity, 0)})
                </span>
              )}
            </h2>
            <div className="flex items-center gap-3">
              {/* Timer display */}
              {items.length > 0 && remainingSeconds !== null && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black ${
                  isLowTime
                    ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(remainingSeconds)}</span>
                </div>
              )}
              <button
                onClick={close}
                aria-label="Cerrar carrito"
                className="inline-flex items-center justify-center rounded-xl min-h-[44px] min-w-[44px] text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Expired warning */}
          {expired && items.length === 0 && (
            <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-600 font-bold">
                Tu carrito expiró. Los artículos fueron devueltos al stock. Volvé a agregarlos si los querés.
              </p>
            </div>
          )}

          <div className="touch-pan-y flex-1 overflow-y-auto overscroll-contain p-4">
            {items.length === 0 && !expired && (
              <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <ShoppingBag className="w-7 h-7 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 ">Tu carrito está vacío</p>
                  <p className="mt-1 text-xs text-gray-500 font-bold">Sumá tus próximos kicks al carrito.</p>
                </div>
                <Link
                  prefetch={false}
                  href="/productos"
                  onClick={close}
                  className="inline-flex items-center gap-2 rounded-full bg-pricing text-white px-6 py-3 text-xs font-normal hover:bg-pricing-hover active:scale-[0.98] transition"
                >
                  Ver productos
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                {/* Atajos: el carrito vacío no es un callejón sin salida */}
                <ul className="mt-2 flex flex-wrap justify-center gap-2">
                  {QUICK_PICKS.map((c) => (
                    <li key={c.href}>
                      <Link prefetch={false} href={c.href} onClick={close} className="pill-apple">
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {items.map((it) => (
              <div
                key={`${it.productId}-${it.size}`}
                className="cart-line"
                data-leaving={leaving.includes(`${it.productId}-${it.size}`) || undefined}
              >
              <div>
              <div className="mb-4 flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                {it.imageUrl && (
                  <img
                    src={it.imageUrl}
                    alt={it.title}
                    loading="lazy"
                    className="h-20 w-20 rounded-lg object-contain bg-white"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/producto/${it.slug}`} onClick={close} className="line-clamp-2 text-sm font-black text-gray-900 hover:text-gray-600 transition-colors">
                    {it.title}
                  </Link>
                  <div className="mt-1 text-xs text-gray-400 font-bold">Talle: {it.size}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-gray-300 bg-white overflow-hidden">
                      <button
                        type="button"
                        aria-label="Disminuir cantidad"
                        disabled={it.quantity <= 1}
                        onClick={() => updateQty(it.productId, it.size, it.quantity - 1)}
                        className="flex items-center justify-center w-9 h-10 text-gray-900 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-black text-gray-900 tabular-nums" aria-live="polite">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Aumentar cantidad"
                        onClick={() => updateQty(it.productId, it.size, it.quantity + 1)}
                        className="flex items-center justify-center w-9 h-10 text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      className="ml-auto rounded-lg px-3 min-h-[40px] text-xs text-red-500 hover:bg-red-50 active:bg-red-100 font-black transition-colors"
                      onClick={() => removeLine(it.productId, it.size)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-gray-900">
                    ${(it.price * it.quantity).toFixed(2)}
                    <span className="text-xs text-gray-400 ml-0.5">USD</span>
                  </p>
                  <p className="text-xs font-bold text-gray-500 mt-0.5">
                    {formatARS(it.price * it.quantity * dolarOficial)}
                  </p>
                </div>
              </div>
              </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 p-4">
            {items.length > 0 ? (
              <>
                <dl className="space-y-1.5 text-[15px]">
                  <div className="flex items-baseline justify-between">
                    <dt className="text-gray-600">Envío</dt>
                    <dd className="font-semibold text-gray-900">Gratis</dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="font-semibold text-gray-900">Total</dt>
                    <dd className="text-right">
                      <span className="block text-[19px] font-semibold text-gray-900 tabular-nums">
                        ${subtotalUSD.toFixed(2)}
                        <span className="ml-0.5 text-xs font-normal text-gray-500">USD</span>
                      </span>
                      <span className="block text-[15px] text-gray-700 tabular-nums">{formatARS(subtotalARS)} por transferencia o efectivo</span>
                    </dd>
                  </div>
                </dl>
                <p className={cn('mt-1.5 text-right text-[13px] tabular-nums', promoOn ? 'text-red-600' : 'text-gray-500')}>
                  o 3 cuotas de {formatARS(installmentArs)}
                  {promoOn ? ' sin interés' : ''} con tarjeta
                </p>

                <Link
                  href="/checkout"
                  onClick={() => {
                    trackEvent('cart_checkout_click', 'ecommerce', { items: items.length, total_usd: subtotalUSD });
                    close();
                  }}
                  className="btn-apple mt-3.5 w-full"
                >
                  Finalizar compra
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button type="button" onClick={close} className="mt-1 min-h-[44px] w-full text-[15px] text-primary">
                  Seguir mirando
                </button>

                {/* Lo que la persona necesita saber justo antes de pagar */}
                <ul className="mt-1 space-y-1.5 border-t border-gray-200 pt-3 text-[13px] text-gray-600">
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-gray-900" aria-hidden /> 100% original, con comprobante de compra
                  </li>
                  <li className="flex items-center gap-2">
                    <Truck className="h-4 w-4 shrink-0 text-gray-900" aria-hidden /> Envío gratis a todo el país o retiro en San Juan
                  </li>
                  <li className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 shrink-0 text-gray-900" aria-hidden /> Transferencia, efectivo o tarjeta en hasta 6 cuotas
                  </li>
                </ul>
                {remainingSeconds !== null && (
                  <p className="mt-2.5 text-[12px] text-gray-500">
                    Reservado por {formatTime(remainingSeconds)}. En el checkout el tiempo no corre.
                  </p>
                )}
              </>
            ) : (
              <p className="py-1 text-center text-[13px] text-gray-500">Envío gratis a todo el país · 100% originales</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
