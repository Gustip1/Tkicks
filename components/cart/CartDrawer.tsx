"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cart';
import { useUIStore } from '@/store/ui';
import { formatCurrency } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';

export function CartDrawer() {
  const { items, updateQty, removeItem, checkExpiry, getRemainingSeconds, clear } = useCartStore();
  const subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const isOpen = useUIStore((s) => s.isCartOpen);
  const close = useUIStore((s) => s.closeCart);
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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = remainingSeconds !== null && remainingSeconds <= 30;

  return (
    <>
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md translate-x-full border-l border-gray-200 bg-white shadow-xl transition-transform md:w-[420px] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] ${
          isOpen ? '!translate-x-0' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Carrito</h2>
            <div className="flex items-center gap-3">
              {/* Timer display */}
              {items.length > 0 && remainingSeconds !== null && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black ${
                  isLowTime
                    ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(remainingSeconds)}</span>
                </div>
              )}
              <button onClick={close} className="rounded-xl px-4 min-h-[44px] text-sm text-gray-900 hover:bg-gray-100 active:bg-gray-200 font-black border border-gray-300 hover:border-gray-900 transition-all">
                Cerrar
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

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {items.length === 0 && !expired && <p className="text-sm text-gray-400 font-bold">Tu carrito está vacío.</p>}
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
                  <Link href={`/producto/${it.slug}`} className="line-clamp-2 text-sm font-black text-gray-900 hover:text-gray-600">
                    {it.title}
                  </Link>
                  <div className="mt-1 text-xs text-gray-400 font-bold">Talle: {it.size}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-gray-900 font-black" htmlFor={`qty-${it.productId}-${it.size}`}>
                      Cant.
                    </label>
                    <input
                      id={`qty-${it.productId}-${it.size}`}
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min={1}
                      className="h-11 w-16 rounded-lg border border-gray-300 bg-white px-2 text-base text-gray-900 font-black text-center focus:border-gray-900 focus:outline-none"
                      value={it.quantity}
                      onChange={(e) => updateQty(it.productId, it.size, Number(e.target.value))}
                    />
                    <button
                      className="ml-auto rounded-lg px-3 min-h-[44px] text-xs text-red-500 hover:bg-red-50 active:bg-red-100 font-black uppercase transition-colors"
                      onClick={() => removeItem(it.productId, it.size)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="text-sm font-black text-gray-900">{formatCurrency(it.price)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-black text-gray-900 uppercase tracking-wide">Subtotal</span>
              <span className="font-black text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            {items.length > 0 && remainingSeconds !== null && (
              <p className="mt-1 text-xs text-amber-600 font-bold">
                ⏱ Tenés {formatTime(remainingSeconds)} para completar tu compra
              </p>
            )}
            <Link
              href="/checkout"
              onClick={close}
              className={`mt-3 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-black uppercase tracking-tight shadow-lg transition-colors ${
                items.length === 0
                  ? 'bg-gray-100 text-gray-400 pointer-events-none'
                  : 'bg-gray-900 text-white hover:bg-black'
              }`}
            >
              Ir al Checkout
            </Link>
          </div>
        </div>
      </div>
      {isOpen && (
        <button
          aria-label="Cerrar carrito"
          onClick={close}
          className="fixed inset-0 z-40 bg-black/20"
        />
      )}
    </>
  );
}


