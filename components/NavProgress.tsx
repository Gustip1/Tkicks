"use client";
import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Hilo de carga arriba de todo, al tocar un link interno.
 *
 * Las fichas se generan en cada visita y los links no se precargan: con datos
 * móviles, entre el toque y la página nueva pasaban uno o dos segundos sin que
 * nada se moviera, y parecía que el toque no había entrado. El hilo responde
 * en el momento y se completa cuando llega la página.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Misma página (o solo un ancla): no hay nada que esperar
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      clear();
      setState('loading');
      // Si la navegación no ocurre (descarga, error), el hilo no queda colgado
      timers.current.push(setTimeout(() => setState('idle'), 8000));
    };
    // En captura: el link de Next cancela el evento para navegar sin recargar,
    // así que al burbujear ya llega como "cancelado"
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Llegó la página nueva: se completa y se va
  useEffect(() => {
    setState((s) => {
      if (s !== 'loading') return s;
      clear();
      timers.current.push(setTimeout(() => setState('idle'), 500));
      return 'done';
    });
  }, [pathname, search]);

  useEffect(() => clear, []);

  return <div aria-hidden className="nav-progress" data-state={state} />;
}
