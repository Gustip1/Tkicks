"use client";
import { useEffect, useRef } from 'react';

/**
 * Cerrar un panel lateral deslizándolo con el dedo hacia la derecha, como las
 * hojas de iOS (skill apple-design, "Designing Fluid Interfaces"):
 *
 * - Sigue al dedo 1:1 desde el primer píxel, sin transición en el medio.
 * - Hacia el lado contrario resiste (rubber band) en vez de frenar en seco.
 * - Al soltar decide por dónde IBA el gesto, no por dónde quedó: proyecta la
 *   inercia, así un toque rápido alcanza para cerrarlo aunque haya recorrido poco.
 * - La animación de salida arranca desde donde está el panel y dura según la
 *   velocidad del dedo, para que no haya costura entre arrastre y animación.
 *
 * Solo táctil: con mouse no se arrastra. Un primer movimiento de 10px define si
 * el gesto es horizontal (cerrar) o vertical (scroll de la lista); si es
 * vertical, se deja pasar entero al navegador.
 */

const SLOP = 10;

/** Resistencia progresiva: cuanto más se pasa del borde, menos sigue al dedo */
function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Dónde terminaría el gesto por inercia (función de Apple, deceleración de scroll) */
function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

export function useSwipeToDismiss<T extends HTMLElement, B extends HTMLElement = HTMLElement>(
  onDismiss: () => void,
  enabled: boolean
) {
  const panelRef = useRef<T>(null);
  const backdropRef = useRef<B>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const el = panelRef.current;
    if (!el || !enabled) return;

    let pointerId: number | null = null;
    let axis: 'x' | 'y' | null = null;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let samples: { x: number; t: number }[] = [];
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const setDragging = (on: boolean) => {
      el.dataset.dragging = on ? 'true' : 'false';
      if (backdropRef.current) backdropRef.current.dataset.dragging = on ? 'true' : 'false';
    };

    const paint = (offset: number) => {
      el.style.transform = `translate3d(${offset}px,0,0)`;
      const backdrop = backdropRef.current;
      if (backdrop) backdrop.style.opacity = String(Math.max(0, 1 - offset / el.offsetWidth));
    };

    const onDown = (e: PointerEvent) => {
      // Solo el primer dedo: si apoya otro en medio del gesto, se ignora
      if (e.pointerType === 'mouse' || pointerId !== null) return;
      pointerId = e.pointerId;
      axis = null;
      dx = 0;
      startX = e.clientX;
      startY = e.clientY;
      samples = [{ x: e.clientX, t: e.timeStamp }];
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (!axis) {
        const mx = e.clientX - startX;
        const my = e.clientY - startY;
        if (Math.hypot(mx, my) < SLOP) return;
        axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
        if (axis === 'y') {
          pointerId = null; // es scroll: no es nuestro
          return;
        }
        clearTimeout(settleTimer);
        try {
          el.setPointerCapture(e.pointerId); // sigue aunque el dedo salga del panel
        } catch {
          /* puntero ya liberado: el gesto funciona igual */
        }
        setDragging(true);
        startX = e.clientX; // arranca desde acá: sin salto por los 10px de margen
      }
      dx = e.clientX - startX;
      paint(dx >= 0 ? dx : -rubberband(-dx, el.offsetWidth));
      samples.push({ x: e.clientX, t: e.timeStamp });
      if (samples.length > 5) samples.shift();
    };

    const release = (e: PointerEvent, cancelled: boolean) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      if (axis !== 'x') return;

      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = last.t - first.t;
      const velocity = dt > 0 ? ((last.x - first.x) / dt) * 1000 : 0; // px/s
      const width = el.offsetWidth;
      const current = Math.max(0, dx);
      const dismiss = !cancelled && current + project(velocity) > width / 2;

      // La salida dura lo que tardaría el dedo en recorrer lo que falta
      const remaining = dismiss ? width - current : current;
      const speed = Math.abs(velocity);
      const ms = speed > 50 ? Math.min(400, Math.max(180, (remaining / speed) * 1000)) : 300;

      setDragging(false);
      el.style.transitionDuration = `${ms}ms`;
      el.style.transform = '';
      if (backdropRef.current) backdropRef.current.style.opacity = '';
      if (dismiss) dismissRef.current();
      settleTimer = setTimeout(() => {
        el.style.transitionDuration = '';
      }, ms + 50);
    };

    const onUp = (e: PointerEvent) => release(e, false);
    const onCancel = (e: PointerEvent) => release(e, true);

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    return () => {
      clearTimeout(settleTimer);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
    };
  }, [enabled]);

  return { panelRef, backdropRef };
}
