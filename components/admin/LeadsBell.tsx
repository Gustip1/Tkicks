"use client";
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { chime } from '@/components/admin/SalesBell';
import { Lead, leadSummary } from '@/lib/leads';

const POLL_MS = 30_000;
export const LEADS_CHANGED_EVENT = 'tk-admin-consultas';

/**
 * Consultas sin responder: el número queda hasta que las contestás o las
 * descartás, y con el panel abierto avisa la que entra.
 */
export function LeadsBell() {
  const [count, setCount] = useState(0);
  const [toast, setToast] = useState<Lead | null>(null);
  const announced = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(50);
    // Sin la tabla (falta la migración) no se muestra nada
    if (error) return;
    const list = (data ?? []) as Lead[];
    setCount(list.length);
    const fresh = list.filter((l) => !announced.current.has(l.id));
    list.forEach((l) => announced.current.add(l.id));
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (fresh.length) {
      setToast(fresh[0]);
      chime();
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(load, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(LEADS_CHANGED_EVENT, load);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(LEADS_CHANGED_EVENT, load);
    };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 15000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <Link
        href="/admin/consultas"
        className="relative rounded-xl p-2.5 text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label={count ? `${count} consultas sin responder` : 'Consultas'}
      >
        <MessageCircle className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-600 px-1 text-[11px] font-bold text-white">
            {count}
          </span>
        )}
      </Link>

      {toast && (
        <div role="status" aria-live="polite" className="fixed right-4 top-36 z-[60] w-[min(92vw,360px)]">
          <div className="flex items-start gap-3 rounded-[18px] bg-white p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </div>
            <Link href="/admin/consultas" onClick={() => setToast(null)} className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Nueva consulta en la web</p>
              <p className="text-sm text-gray-900">{leadSummary(toast)}</p>
              <p className="truncate text-xs text-gray-500">{toast.name ? `${toast.name} · ` : ''}{toast.phone}</p>
            </Link>
            <button onClick={() => setToast(null)} aria-label="Cerrar aviso de consulta" className="rounded-full p-1 text-gray-400 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
