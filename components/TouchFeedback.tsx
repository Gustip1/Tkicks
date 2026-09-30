"use client";
import { useEffect } from 'react';

/**
 * Safari de iPhone no aplica `:active` si la página no escucha toques: sin
 * esto, los botones no se hunden al apoyar el dedo y la respuesta recién se ve
 * al soltar. Un listener vacío y pasivo alcanza para que el estado de
 * presionado aparezca en el instante del toque, como en iOS.
 */
export function TouchFeedback() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener('touchstart', noop, { passive: true });
    return () => document.removeEventListener('touchstart', noop);
  }, []);
  return null;
}
