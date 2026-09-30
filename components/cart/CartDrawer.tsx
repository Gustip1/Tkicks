"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cart';
import { useUIStore } from '@/store/ui';
import { formatCurrency, cn } from '@/lib/utils';
import { useDolarRate } from '@/components/DolarRateProvider';
import { useSwipeToDismiss } from '@/lib/useSwipeToDismiss';
import { Clock, AlertTriangle, X, ShoppingBag, Minus, Plus, ArrowRight } from 'lucide-react';

export function CartDrawer() {
  const { items, updateQty, removeItem, checkExpiry, getRemainingSeconds } = useCartStore();
  const { rate: dolarOficial } = useDolarRate();
  const subtotalUSD = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const subtotalARS = subtotalUSD * dolarOficial;
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

          <div className="touch-pan-y flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
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
                  href="/productos"
                  onClick={close}
                  className="inline-flex items-center gap-2 rounded-full bg-primary text-white px-6 py-3 text-xs font-normal hover:bg-primary-hover active:scale-[0.98] transition"
                >
                  Ver productos
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
            {items.map((it) => (
              <div key={`${it.productId}-${it.size}`} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
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
                      onClick={() => removeItem(it.productId, it.size)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-gray-900">
                    ${(it.price * it.quantity).toFixed(2)}
                    <span className="text-[10px] text-gray-400 ml-0.5">USD</span>
                  </p>
                  <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                    {formatCurrency(it.price * it.quantity * dolarOficial)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-black text-gray-900 ">Subtotal</span>
              <span className="font-black text-gray-900">
                ${subtotalUSD.toFixed(2)}
                <span className="text-[10px] text-gray-400 ml-0.5">USD</span>
              </span>
            </div>
            {items.length > 0 && (
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-400">Transferencia / Efectivo</span>
                <span className="font-black text-gray-700">{formatCurrency(subtotalARS)}</span>
              </div>
            )}
            {items.length > 0 && remainingSeconds !== null && (
              <p className="mt-1 text-xs text-gray-600 font-bold">
                Tenés {formatTime(remainingSeconds)} para completar tu compra
              </p>
            )}
            <Link
              href="/checkout"
              onClick={close}
              className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-black shadow-lg transition ${
                items.length === 0
                  ? 'bg-gray-100 text-gray-400 pointer-events-none shadow-none'
                  : 'bg-gray-900 text-white hover:bg-black active:scale-[0.99]'
              }`}
            >
              Ir al Checkout
              {items.length > 0 && <ArrowRight className="w-4 h-4" />}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
