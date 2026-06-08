"use client";
import { useEffect, useState } from 'react';
import { DolarWidget } from '@/components/DolarWidget';
import { isPromoActive } from '@/lib/promo';

const BASE_ITEMS = [
  '✓ Productos 100% originales',
  '📦 Envíos a todo el país',
  '✨ Productos únicos y exclusivos',
];

const NORMAL_INSTALLMENT = '💳 3 cuotas sin interés (10% de recargo)';
const PROMO_INSTALLMENT = '🔥 PROMO 11-17/05: 3 cuotas sin interés SIN recargo';

export function BannerTicker() {
  // Server siempre renderiza el mensaje normal; el cliente lo cambia
  // post-mount si la promo está activa, evitando hydration mismatch.
  const [installmentMsg, setInstallmentMsg] = useState(NORMAL_INSTALLMENT);

  useEffect(() => {
    setInstallmentMsg(isPromoActive() ? PROMO_INSTALLMENT : NORMAL_INSTALLMENT);
  }, []);

  const items = [installmentMsg, ...BASE_ITEMS];

  return (
    <div className="w-full bg-gray-900 text-white border-b border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-2 md:px-4 max-w-[1600px] mx-auto">
        <div className="relative overflow-hidden flex-1 min-w-0" aria-label="Ofertas y mensajes importantes" role="region">
          <div className="animate-marquee whitespace-nowrap py-1.5 md:py-2 will-change-transform">
            {[...items, ...items].map((item, idx) => (
              <span key={idx} className="mx-3 md:mx-6 inline-block text-[10px] md:text-sm font-bold">
                {item}
              </span>
            ))}
          </div>
        </div>
        {/* Widget del dólar - OCULTO en móvil, VISIBLE en desktop */}
        <div className="hidden md:flex shrink-0 border-l border-white/30 pl-4 ml-4">
          <DolarWidget />
        </div>
      </div>
    </div>
  );
}
