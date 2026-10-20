"use client";
import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * La base de todos los popups de la tienda, para que se vean y se comporten
 * igual (antes cada uno era distinto: degradés, brillos, emojis).
 *
 * - Celular: hoja que sube desde abajo con la curva de iOS, con la manija
 *   arriba; se cierra deslizándola hacia abajo (sigue al dedo y decide por la
 *   velocidad, como en el iPhone).
 * - Escritorio: tarjeta centrada que se "materializa" (desenfoque + escala).
 * - El fondo se oscurece y desenfoca, la página no scrollea y el foco queda
 *   adentro; al cerrar vuelve a donde estaba.
 * - Sin `onClose` es bloqueante: no cierra con Escape, ni tocando afuera, ni
 *   deslizando (el aviso de cuenta, que se acepta con su botón).
 * - Se monta en <body>: dentro de la página hay animaciones con transform que
 *   romperían el `position: fixed`.
 */

const EXIT_MS = 260;

export function Sheet({
  open,
  onClose,
  labelledBy,
  describedBy,
  children,
  className,
  size = 'md',
  flushBottom = false,
}: {
  open: boolean;
  onClose?: () => void;
  labelledBy: string;
  describedBy?: string;
  children: ReactNode;
  className?: string;
  /** md: avisos (420px) · lg: textos largos (560px) · xl: dos columnas en escritorio (880px) */
  size?: 'md' | 'lg' | 'xl';
  /** El contenido trae su propio pie fijo con el margen de abajo (textos largos) */
  flushBottom?: boolean;
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dismissible = Boolean(onClose);

  // Entrada y salida: se monta, en el cuadro siguiente se muestra (así corre
  // la transición) y al cerrar espera la salida antes de desmontar.
  useEffect(() => {
    if (open) {
      setMounted(true);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
      };
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Página quieta, foco adentro, Escape cierra (si se puede) y al final el
  // foco vuelve al botón que lo abrió.
  useEffect(() => {
    if (!open || !mounted) return;
    const panel = panelRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Si un campo ya tomó el foco (autoFocus), se respeta
    if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeRef.current) {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      // Solo los que se ven: en celular el botón de cerrar está oculto y, si
      // contara, el foco se trababa en el último o se escapaba de la hoja
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, mounted]);

  // Deslizar hacia abajo para cerrar (celular). Arranca desde la manija o el
  // encabezado, sigue al dedo 1:1, resiste hacia arriba y decide por la
  // distancia o por la velocidad del gesto.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !mounted || !dismissible) return;
    let startY = 0;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;
    let dragging = false;
    let id: number | null = null;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || id !== null) return;
      if (!(e.target as HTMLElement).closest('[data-sheet-handle]')) return;
      id = e.pointerId;
      startY = lastY = e.clientY;
      lastT = e.timeStamp;
      velocity = 0;
      dragging = true;
      panel.dataset.dragging = 'true';
      try {
        panel.setPointerCapture(e.pointerId);
      } catch {
        /* sin captura igual funciona */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== id) return;
      const dy = e.clientY - startY;
      const dt = e.timeStamp - lastT;
      if (dt > 0) velocity = (e.clientY - lastY) / dt;
      lastY = e.clientY;
      lastT = e.timeStamp;
      // Hacia arriba resiste: se mueve mucho menos que el dedo
      const y = dy >= 0 ? dy : -Math.sqrt(-dy) * 2;
      panel.style.transform = `translate3d(0, ${y}px, 0)`;
      if (scrimRef.current) scrimRef.current.style.opacity = String(Math.max(0, 1 - dy / panel.offsetHeight));
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== id) return;
      dragging = false;
      id = null;
      panel.dataset.dragging = 'false';
      const dy = e.clientY - startY;
      panel.style.transform = '';
      if (scrimRef.current) scrimRef.current.style.opacity = '';
      if (dy > 120 || (dy > 24 && velocity > 0.5)) closeRef.current?.();
    };
    panel.addEventListener('pointerdown', onDown);
    panel.addEventListener('pointermove', onMove);
    panel.addEventListener('pointerup', onUp);
    panel.addEventListener('pointercancel', onUp);
    return () => {
      panel.removeEventListener('pointerdown', onDown);
      panel.removeEventListener('pointermove', onMove);
      panel.removeEventListener('pointerup', onUp);
      panel.removeEventListener('pointercancel', onUp);
    };
  }, [mounted, dismissible]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6" data-state={shown ? 'open' : 'closed'}>
      <div
        ref={scrimRef}
        aria-hidden
        onClick={() => onClose?.()}
        className="sheet-scrim absolute inset-0 bg-black/40 backdrop-blur-[10px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cn(
          'sheet-panel relative w-full bg-white text-gray-900 outline-none',
          'rounded-t-[22px] sm:rounded-[22px] max-h-[92dvh] overflow-y-auto overscroll-contain',
          !flushBottom && 'pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-0',
          'shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_24px_80px_rgba(0,0,0,0.22)]',
          size === 'xl' ? 'sm:max-w-[560px] md:max-w-[880px]' : size === 'lg' ? 'sm:max-w-[560px]' : 'sm:max-w-[420px]',
          className
        )}
      >
        {/* Manija: muestra que se puede deslizar (solo celular, solo si se puede cerrar) */}
        {dismissible && (
          <div data-sheet-handle className="sm:hidden flex justify-center pt-2.5 pb-1 touch-none">
            <span className="h-[5px] w-9 rounded-full bg-gray-300" />
          </div>
        )}
        {dismissible && (
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-10 hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 active:scale-95"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

/** Zona de la hoja desde donde se puede arrastrar para cerrarla (además de la manija). */
export function SheetHandleArea({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-sheet-handle className={cn('touch-none', className)}>
      {children}
    </div>
  );
}
