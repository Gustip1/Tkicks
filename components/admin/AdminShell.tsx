import { ReactNode } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

/**
 * Armazón del panel: menú a la izquierda, barra arriba y el contenido.
 *
 * Scrollea la página, no una caja adentro. Antes el panel medía la pantalla
 * entera (`h-screen`) con el contenido en una caja con scroll propio, y además
 * quedaba metido dentro del contenedor de la tienda (con su margen): había dos
 * scrolls a la vez. La rueda o el dedo movían uno u otro, el final de las
 * listas quedaba tapado por la barra del navegador en el celular, y al volver
 * atrás no se recuperaba la posición. Ahora el navegador se encarga de todo:
 * vuelve arriba al cambiar de sección y recuerda dónde estabas al volver.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-white text-black md:flex">
      <AdminSidebar />
      {/* min-w-0: una tabla ancha se desliza en su recuadro, no ensancha la página */}
      <div className="min-w-0 flex-1">
        <AdminHeader />
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
