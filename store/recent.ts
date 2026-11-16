import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface RecentState {
  /** Ids de producto, el último visto primero */
  ids: string[];
  see: (id: string) => void;
}

const MAX = 12;

/** Productos vistos, guardados en este dispositivo: para retomar donde se dejó */
export const useRecentStore = create<RecentState>()(
  persist(
    (set, get) => ({
      ids: [],
      see: (id) => {
        if (get().ids[0] === id) return;
        set({ ids: [id, ...get().ids.filter((x) => x !== id)].slice(0, MAX) });
      },
    }),
    { name: 'tk-vistos', storage: createJSONStorage(() => localStorage) }
  )
);
