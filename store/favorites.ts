import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface FavoritesState {
  /** Ids de producto, el más reciente primero */
  ids: string[];
  toggle: (id: string) => boolean;
  remove: (id: string) => void;
}

const MAX = 60;

/**
 * Favoritos: se guardan en este dispositivo, sin cuenta. Es la forma de
 * "me lo quedo mirando" para quien todavía no compra; volver a encontrarlos
 * es un motivo para regresar a la web.
 */
export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const has = get().ids.includes(id);
        set({ ids: has ? get().ids.filter((x) => x !== id) : [id, ...get().ids].slice(0, MAX) });
        return !has;
      },
      remove: (id) => set({ ids: get().ids.filter((x) => x !== id) }),
    }),
    { name: 'tk-favoritos', storage: createJSONStorage(() => localStorage) }
  )
);

/**
 * Los favoritos recién se conocen en el navegador: hasta montar se muestra
 * todo "sin guardar", igual que lo mandó el servidor.
 */
export function useFavoriteIds(): string[] {
  const ids = useFavoritesStore((s) => s.ids);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? ids : EMPTY;
}
const EMPTY: string[] = [];
