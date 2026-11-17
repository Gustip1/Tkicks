"use client";
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * El contenedor del contenido. En la tienda lleva margen y ancho máximo; en el
 * panel no: el panel ocupa toda la pantalla. Antes el margen de la tienda
 * envolvía también al panel y le sumaba un segundo scroll.
 */
export function SiteMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const inAdmin = pathname.startsWith('/admin');
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className={inAdmin ? 'outline-none' : 'outline-none px-2 py-3 md:px-8 md:py-8 lg:px-12 max-w-[1600px] mx-auto bg-white'}
    >
      {children}
    </main>
  );
}
