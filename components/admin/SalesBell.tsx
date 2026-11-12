"use client";
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CreditCard, ShoppingBag, X } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  SALE_COLUMNS,
  SEEN_EVENT,
  TONE_CLASSES,
  WebSale,
  alertTitle,
  amountLabel,
  customerName,
  markSeen,
  methodLabel,
  needsReview,
  readSeen,
  saleRef,
  saleState,
  timeAgo,
} from '@/lib/admin/webSales';

/** Cada cuánto se fija si entró una venta mientras el panel está abierto */
const POLL_MS = 30_000;

/** Dos notas cortas, generadas en el momento (sin archivo de audio) */
export function chime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* el navegador no deja sonar sin interacción previa: queda el aviso visual */
  }
}

/**
 * Campanita del admin: cuenta las ventas nuevas desde la última vez que las
 * miraste y, con el panel abierto, avisa al instante (cartel, sonido y aviso
 * del sistema si lo activaste).
 */
export function SalesBell() {
  const [sales, setSales] = useState<WebSale[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<WebSale | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  // Lo que ya avisamos en esta sesión (para no repetir el cartel)
  const announced = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const baseTitle = useRef<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('orders')
      .select(SALE_COLUMNS)
      .gt('created_at', readSeen())
      .order('created_at', { ascending: false })
      .limit(20);
    // Fuera: cancelados y cobros con tarjeta todavía en curso (unos segundos)
    const list = ((data ?? []) as WebSale[]).filter(
      (s) => s.status !== 'cancelled' && !(s.payment_method === 'card' && s.status === 'draft' && !needsReview(s))
    );
    setSales(list);

    // La primera carga no avisa: son las que ya estaban esperando en la campanita
    const fresh = list.filter((s) => !announced.current.has(s.id));
    list.forEach((s) => announced.current.add(s.id));
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (!fresh.length) return;

    const latest = fresh[0];
    setToast(latest);
    chime();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
      try {
        new Notification(alertTitle(latest), {
          body: `${amountLabel(latest)} · ${methodLabel(latest)} · ${customerName(latest)}`,
          tag: latest.id,
        });
      } catch {
        /* algunos navegadores solo permiten avisos desde un service worker */
      }
    }
  }, []);

  useEffect(() => {
    setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
    void load();
    const interval = setInterval(load, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && void load();
    const onSeen = () => setSales([]);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(SEEN_EVENT, onSeen);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(SEEN_EVENT, onSeen);
    };
  }, [load]);

  // Contador en la pestaña: "(1) Admin - Tkicks"
  useEffect(() => {
    if (baseTitle.current === null) baseTitle.current = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = sales.length ? `(${sales.length}) ${baseTitle.current}` : baseTitle.current;
  }, [sales.length]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 15000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggle = () => {
    setOpen((o) => !o);
  };

  const close = () => {
    setOpen(false);
    // Al cerrar la lista, lo que se vio deja de contar como nuevo
    if (sales.length) markSeen(sales[0].created_at);
  };

  const askPermission = async () => {
    if (typeof Notification === 'undefined') return;
    setPermission(await Notification.requestPermission());
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={open ? close : toggle}
          className="relative rounded-xl p-2.5 text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label={sales.length ? `${sales.length} ventas nuevas` : 'Ventas nuevas'}
          aria-expanded={open}
        >
          <Bell className="h-5 w-5" />
          {sales.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
              {sales.length}
            </span>
          )}
        </button>

        {open && (
          <>
            <button className="fixed inset-0 z-40 cursor-default" aria-label="Cerrar" onClick={close} />
            <div className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">Ventas nuevas</p>
                <Link href="/admin/pedidos" onClick={close} className="text-xs text-blue-600 hover:underline">
                  Ver pedidos
                </Link>
              </div>
              {sales.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-500">No entró nada nuevo desde la última vez.</p>
              ) : (
                <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto">
                  {sales.map((s) => {
                    const state = saleState(s);
                    return (
                      <li key={s.id}>
                        <Link href={`/admin/pedidos/${s.id}`} onClick={close} className="block px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-gray-900">{amountLabel(s)}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[state.tone]}`}>
                              {state.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-600">{methodLabel(s)}</p>
                          <p className="text-xs text-gray-400">
                            {saleRef(s)} · {customerName(s)} · {timeAgo(s.created_at)}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {permission === 'default' && (
                <button
                  onClick={askPermission}
                  className="w-full border-t border-gray-100 px-4 py-3 text-left text-xs text-blue-600 hover:bg-gray-50"
                >
                  Activar avisos del sistema en este dispositivo (llegan aunque estés en otra pestaña)
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Aviso al instante cuando entra una venta con el panel abierto */}
      {toast && (
        <div role="status" aria-live="polite" className="fixed right-4 top-20 z-[60] w-[min(92vw,360px)]">
          <div className="flex items-start gap-3 rounded-[18px] bg-white p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
              {toast.payment_method === 'card' ? (
                <CreditCard className="h-5 w-5" aria-hidden />
              ) : (
                <ShoppingBag className="h-5 w-5" aria-hidden />
              )}
            </div>
            <Link href={`/admin/pedidos/${toast.id}`} onClick={() => setToast(null)} className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{alertTitle(toast)}</p>
              <p className="text-sm text-gray-900">{amountLabel(toast)}</p>
              <p className="truncate text-xs text-gray-500">
                {methodLabel(toast)} · {customerName(toast)}
              </p>
            </Link>
            <button onClick={() => setToast(null)} aria-label="Cerrar aviso" className="rounded-full p-1 text-gray-400 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
