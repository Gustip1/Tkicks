"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { InstallmentsPromoContent, DEFAULT_INSTALLMENTS_PROMO_CONTENT } from '@/lib/homeContent';

const InstallmentsPromoContext = createContext<InstallmentsPromoContent>(DEFAULT_INSTALLMENTS_PROMO_CONTENT);

/** true cuando el admin activó "3 cuotas sin interés sin recargo" desde /admin/ajustes. */
export function useInstallmentsPromo() {
  return useContext(InstallmentsPromoContext);
}

export function InstallmentsPromoProvider({ children }: { children: ReactNode }) {
  const [promo, setPromo] = useState<InstallmentsPromoContent>(DEFAULT_INSTALLMENTS_PROMO_CONTENT);

  useEffect(() => {
    let active = true;
    const supabase = createBrowserClient();
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'installments_promo')
        .maybeSingle();
      if (!active) return;
      const value = data?.value as Partial<InstallmentsPromoContent> | undefined;
      if (value) setPromo({ ...DEFAULT_INSTALLMENTS_PROMO_CONTENT, ...value });
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <InstallmentsPromoContext.Provider value={promo}>
      {children}
    </InstallmentsPromoContext.Provider>
  );
}
