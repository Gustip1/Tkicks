"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency, cn } from '@/lib/utils';

/**
 * Barra de compra fija al pie, solo mobile: el botón de agregar al carrito
 * queda lejos (descripción + precios + oferta arriba), así que esta barra
 * mantiene el precio y un acceso directo siempre a mano. Se oculta sola
 * cuando la sección de compra ya está a la vista, para no duplicarla.
 */
export function MobileBuyBar({
  priceUsd,
  priceArs,
  targetId,
}: {
  priceUsd: number;
  priceArs: number;
  targetId: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { threshold: 0.25 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  const scrollToBuy = () => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Portal a <body>: el contenedor de la página tiene una animación con
  // transform, y un ancestro con transform hace que position:fixed se ancle
  // al contenedor en vez de a la pantalla (la barra quedaba abajo del todo
  // del contenido en lugar de pegada al viewport).
  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        'lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] transition-transform duration-300',
        hidden && 'translate-y-full'
      )}
    >
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        <div className="min-w-0">
          <p className="text-lg font-black text-gray-900 leading-tight truncate">
            {formatCurrency(priceArs)}
          </p>
          <p className="text-[11px] font-bold text-gray-500 leading-tight">
            ${priceUsd.toFixed(2)} USD · transf. / efectivo
          </p>
        </div>
        <button
          onClick={scrollToBuy}
          className="shrink-0 px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-black uppercase tracking-tight active:scale-95 transition-transform"
        >
          Comprar
        </button>
      </div>
    </div>,
    document.body
  );
}
