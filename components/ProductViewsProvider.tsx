"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { ProductViews } from '@/lib/productViews';

type ViewsMap = Record<string, ProductViews>;

const ProductViewsContext = createContext<ViewsMap>({});

/** Visitas reales de un producto, o null si son pocas para mostrarlas */
export function useProductViews(slug: string | undefined): ProductViews | null {
  const map = useContext(ProductViewsContext);
  return (slug && map[slug]) || null;
}

/**
 * Trae una sola vez las visitas de todos los productos (/api/product-views,
 * que se guarda 10 minutos en la red) para que cada tarjeta muestre la suya
 * sin hacer su propia consulta.
 */
export function ProductViewsProvider({ children }: { children: ReactNode }) {
  const [views, setViews] = useState<ViewsMap>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/product-views')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.views && typeof data.views === 'object') setViews(data.views as ViewsMap);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return <ProductViewsContext.Provider value={views}>{children}</ProductViewsContext.Provider>;
}
