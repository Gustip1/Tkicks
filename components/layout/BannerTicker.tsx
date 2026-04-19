"use client";
import { DolarWidget } from '@/components/DolarWidget';

export function BannerTicker() {
  const items = [
    '💳 Pagá en hasta 3 cuotas sin interés',
    '🔒 Solo producto 100% original y verificado',
    '📦 Envíos rápidos a todo el país',
    '🏷️ Nuevos drops todas las semanas',
    '⚡ Stock limitado — cuando se va, no vuelve',
  ];
  
  return (
    <div className="w-full bg-black text-white border-b border-zinc-800 overflow-hidden">
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
        <div className="hidden md:flex shrink-0 border-l border-white/20 pl-4 ml-4">
          <DolarWidget />
        </div>
      </div>
    </div>
  );
}
