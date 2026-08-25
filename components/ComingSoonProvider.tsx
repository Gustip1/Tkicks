"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

const ComingSoonContext = createContext<Set<string>>(new Set());

/** true si el producto está marcado como "próximo ingreso" desde /admin/proximos. */
export function useIsComingSoon(productId: string | undefined) {
  const ids = useContext(ComingSoonContext);
  return productId ? ids.has(productId) : false;
}

// Mismo criterio que InstallmentsPromoProvider: el layout raíz no se remonta
// al navegar, así que sin un refresco periódico alguien que ya tenía el sitio
// abierto se quedaría con la lista vieja hasta recargar a mano.
const REFRESH_INTERVAL_MS = 60_000;

export function ComingSoonProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  const fetchIds = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'coming_soon')
      .maybeSingle();
    const raw = (data?.value as { ids?: unknown } | null)?.ids;
    setIds(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
  }, []);

  useEffect(() => {
    fetchIds();
    const interval = setInterval(fetchIds, REFRESH_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchIds();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchIds]);

  const value = useMemo(() => new Set(ids), [ids]);

  return <ComingSoonContext.Provider value={value}>{children}</ComingSoonContext.Provider>;
}
