"use client";
import { useEffect, useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { useUIStore } from '@/store/ui';

interface Sale {
  title: string;
  /** Solo si el pedido la tiene: nunca se inventa */
  city: string | null;
  minutesAgo: number;
  imageUrl?: string;
}

/** Como mucho tantos avisos por visita: más que eso molesta */
const MAX_PER_VISIT = 3;

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function RecentSaleToast() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [current, setCurrent] = useState<Sale | null>(null);
  const [visible, setVisible] = useState(false);
  const [, setIndex] = useState(0);

  useEffect(() => {
    // Los pedidos son privados: el servidor devuelve solo qué se vendió, dónde y
    // cuándo, de las últimas 48 h (así "hace X" y "ayer" son ciertos)
    (async () => {
      const res = await fetch('/api/recent-sales').catch(() => null);
      if (!res?.ok) return;
      const data: { sales?: { title: string; city: string | null; createdAt: string; imageUrl: string | null }[] } =
        await res.json().catch(() => ({}));
      const now = Date.now();
      const list: Sale[] = (data.sales ?? [])
        .filter((s) => s.title)
        .map((s) => ({
          title: s.title,
          city: s.city,
          minutesAgo: Math.max(1, Math.round((now - new Date(s.createdAt).getTime()) / 60000)),
          imageUrl: s.imageUrl ?? undefined,
        }));

      if (list.length) setSales(list);
    })();
  }, []);

  // Un aviso cada 25–45 s, hasta MAX_PER_VISIT. Si hay un popup abierto
  // (aviso de cuenta, promo, carrito) espera: encimados no se lee nada.
  useEffect(() => {
    if (!sales.length) return;
    let shownCount = 0;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      if (shownCount >= MAX_PER_VISIT) return;
      // Hay un popup (hoja), el carrito o el menú abiertos: este aviso espera
      const ui = useUIStore.getState();
      if (document.querySelector('.sheet-panel') || ui.isCartOpen || ui.isSidebarOpen) return;
      shownCount += 1;
      setIndex((i) => {
        const next = (i + 1) % sales.length;
        setCurrent(sales[next]);
        setVisible(true);
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => setVisible(false), 6000);
        return next;
      });
    };

    const first = setTimeout(show, 12000);
    const interval = setInterval(show, randomBetween(25000, 45000));
    return () => { clearTimeout(first); clearInterval(interval); clearTimeout(hideTimer); };
  }, [sales]);

  if (!current || !visible) return null;

  const timeLabel = current.minutesAgo < 60
    ? `hace ${current.minutesAgo} min`
    : current.minutesAgo < 1440
    ? `hace ${Math.round(current.minutesAgo / 60)} h`
    : 'ayer';

  return (
    // Notificación como las del iPhone: vidrio claro, foto del producto, qué
    // se vendió y cuándo. Abajo a la izquierda, lejos del botón de WhatsApp.
    <div
      role="status"
      aria-live="polite"
      className="toast-enter fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 right-24 z-50 sm:left-5 sm:right-auto sm:w-[340px]"
    >
      <div className="flex items-center gap-3 rounded-[18px] bg-white py-2.5 pl-2.5 pr-1 shadow-[0_8px_32px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06]">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-[#f5f5f7]">
          {current.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.imageUrl} alt="" className="h-full w-full object-contain mix-blend-multiply" />
          ) : (
            <ShoppingBag className="absolute inset-0 m-auto h-5 w-5 text-gray-400" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-gray-500">
            Se vendió {timeLabel}{current.city ? ` · ${current.city}` : ''}
          </p>
          <p className="mt-0.5 truncate text-[14px] font-semibold leading-tight text-gray-900">{current.title}</p>
        </div>

        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Cerrar aviso"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-700 active:scale-95"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
