"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Pausa entre elementos que entran en pantalla a la vez (tarjetas de una grilla). */
const STAGGER_MS = 90;
const MAX_STAGGER_MS = 540;

/**
 * Aparición al hacer scroll, como en apple.com: todo lo que tenga
 * `data-reveal` sube y aparece cuando entra en pantalla.
 *
 * Es mejora progresiva: el HTML llega visible, y recién después de marcar
 * como ya revelado lo que está en pantalla se agrega `.reveal-ready` al
 * <html>, que es lo que oculta el resto. Así no hay parpadeo en la carga ni
 * contenido invisible si el JS falla. Con "reducir movimiento" no hace nada.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const root = document.documentElement;

    const io = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
        // Los que entran juntos se escalonan en orden de lectura
        entering
          .sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            return ra.top - rb.top || ra.left - rb.left;
          })
          .forEach((el, i) => {
            el.style.setProperty('--reveal-delay', `${Math.min(i * STAGGER_MS, MAX_STAGGER_MS)}ms`);
            el.classList.add('is-revealed');
            io.unobserve(el);
          });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    const track = (el: Element) => {
      if (el.classList.contains('is-revealed')) return;
      const r = el.getBoundingClientRect();
      // Lo que ya está en pantalla al montar se da por revelado: no parpadea.
      if (!root.classList.contains('reveal-ready') && r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add('is-revealed');
        return;
      }
      io.observe(el);
    };

    const scan = (scope: ParentNode) => scope.querySelectorAll('[data-reveal]').forEach(track);

    scan(document);
    root.classList.add('reveal-ready');

    // Carruseles y listas que cargan después también se animan
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.matches('[data-reveal]')) track(n);
          scan(n);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
