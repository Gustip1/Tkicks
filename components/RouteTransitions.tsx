"use client";
import { usePathname } from 'next/navigation';
import { ReactNode, useRef } from 'react';

/**
 * Entrada suave al cambiar de página.
 *
 * Antes usaba framer-motion con `initial={{ opacity: 0 }}`: el servidor
 * mandaba TODA la página invisible y recién aparecía cuando el JavaScript
 * terminaba de cargar. Con datos móviles eran ~7 segundos de pantalla en
 * blanco, y si el JS fallaba quedaba en blanco hasta recargar.
 *
 * Ahora es una animación de CSS (`page-enter`) que solo se aplica al navegar
 * dentro de la web, nunca en la primera carga: el contenido se ve apenas llega
 * el HTML, con o sin JavaScript.
 */
export function RouteTransitions({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  const navigated = useRef(false);
  if (pathname !== firstPath.current) navigated.current = true;

  return (
    <div key={pathname} className={navigated.current ? 'page-enter' : undefined}>
      {children}
    </div>
  );
}
