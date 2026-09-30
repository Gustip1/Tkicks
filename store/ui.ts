import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  isCartOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  openCart: () => void;
  closeCart: () => void;
}

/**
 * Estado de la interfaz: menú y carrito abiertos o cerrados.
 *
 * NO se guarda en el navegador. Antes se persistía en localStorage, y quien
 * cerraba la pestaña con el carrito (o el menú) abierto volvía a encontrarlo
 * abierto en la próxima visita, tapando la página —incluido el checkout—.
 * Abrir y cerrar paneles es de esta visita, no algo para recordar.
 */
export const useUIStore = create<UIState>()((set, get) => ({
  isSidebarOpen: false,
  isCartOpen: false,
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set({ isSidebarOpen: !get().isSidebarOpen }),
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
}));

// Limpia lo que quedó guardado por la versión anterior en los navegadores de los clientes
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('ui-store');
  } catch {
    /* sin almacenamiento */
  }
}
