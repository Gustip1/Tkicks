"use client";
import { DolarWidget } from '@/components/DolarWidget';

export function BannerTicker() {
  const items = [
    '✨ 3 cuotas sin interés',
    '✓ Productos 100% originales',
    '📦 Envíos a todo el país',
    '🚀 Nuevos ingresos cada semana'
  ];
  
  return (
    <div className="w-full bg-black text-white border-b border-zinc-800">
      <div className="flex items-center justify-between px-2 md:px-4 max-w-[1600px] mx-auto">
        <div className="relative overflow-hidden flex-1 min-w-0" aria-label="Ofertas y mensajes importantes" role="region">
          <div className="animate-marquee whitespace-nowrap py-2 will-change-transform">
            {[...items, ...items].map((item, idx) => (
              <span key={idx} className="mx-4 md:mx-6 inline-block text-[11px] md:text-sm font-bold">
                {item}
              </span>
            ))}
          </div>
        </div>
        {/* Widget del dólar - OCULTO en móvil, VISIBLE en desktop */}
        <div className="hidden md:flex shrink-0 border-l border-white/20 pl-4 ml-4">
          <DolarWidget />
        </div>
      </div>
    </div>
  );
}
