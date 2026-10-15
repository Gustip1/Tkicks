"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
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
    const supabase = createBrowserClient();
    (async () => {
      // Fetch recent paid orders with their items and shipping addresses
      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at, first_name')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!orders?.length) return;

      const orderIds = orders.map((o: any) => o.id);

      const [{ data: items }, { data: addresses }] = await Promise.all([
        supabase.from('order_items').select('order_id, title, product_id').in('order_id', orderIds),
        supabase.from('shipping_addresses').select('order_id, city').in('order_id', orderIds),
      ]);

      const cityMap = new Map((addresses || []).map((a: any) => [a.order_id, a.city]));
      const itemMap = new Map((items || []).map((i: any) => [i.order_id, i.title]));

      // Fetch product images for matching items
      const productTitles = (items || []).map((i: any) => i.title);
      const { data: products } = await supabase
        .from('products')
        .select('title, images')
        .in('title', productTitles.slice(0, 20));
      const imageMap = new Map((products || []).map((p: any) => [p.title, p.images?.[0]?.url]));

      const now = Date.now();
      const list: Sale[] = orders
        .filter((o: any) => itemMap.has(o.id))
        .map((o: any) => {
          const title = itemMap.get(o.id) || '';
          const rawCity = cityMap.get(o.id);
          const city = rawCity ? String(rawCity).trim() || null : null;
          const createdMs = new Date(o.created_at).getTime();
          const diffMin = Math.max(5, Math.round((now - createdMs) / 60000));
          // Cap at 2 days for believability; show as "hace X hs" if > 60 min
          const minutesAgo = Math.min(diffMin, 2880);
          return { title, city, minutesAgo, imageUrl: imageMap.get(title) };
        })
        .filter(s => s.title);

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
