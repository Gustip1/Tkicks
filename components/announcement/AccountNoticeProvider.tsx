"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { ACCOUNT_NOTICE_SETTING_KEY, ACCOUNT_NOTICE_ACK_KEY } from '@/lib/accountNotice';

interface AccountNoticeState {
  /** El admin lo tiene prendido en /admin/ajustes. */
  active: boolean;
  /** El aviso está tapando la pantalla ahora mismo. */
  open: boolean;
  accept: () => void;
}

const AccountNoticeContext = createContext<AccountNoticeState>({
  active: false,
  open: false,
  accept: () => {},
});

/**
 * Estado del aviso de cuenta. Lo consume el popup y también PromoModal, que
 * espera a que el visitante acepte el aviso antes de mostrar su propia promo:
 * dos modales encimados no se leen.
 */
export function useAccountNotice() {
  return useContext(AccountNoticeContext);
}

// El layout raíz no se remonta al navegar, así que sin este refresco alguien
// con la pestaña abierta no se entera de que el admin prendió o apagó el aviso.
const REFRESH_INTERVAL_MS = 60_000;

export function AccountNoticeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [accepted, setAccepted] = useState(true); // hasta saber, no tapamos nada

  useEffect(() => {
    try {
      setAccepted(sessionStorage.getItem(ACCOUNT_NOTICE_ACK_KEY) === '1');
    } catch {
      setAccepted(false);
    }
  }, []);

  const fetchActive = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', ACCOUNT_NOTICE_SETTING_KEY)
      .maybeSingle();
    setActive(Boolean((data?.value as { active?: boolean } | null)?.active));
  }, []);

  useEffect(() => {
    fetchActive();
    const interval = setInterval(fetchActive, REFRESH_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchActive();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchActive]);

  const accept = useCallback(() => {
    setAccepted(true);
    try {
      sessionStorage.setItem(ACCOUNT_NOTICE_ACK_KEY, '1');
    } catch {
      // Si el navegador bloquea sessionStorage el aviso vuelve a aparecer
      // en la próxima carga; molesta un poco, pero no rompe nada.
    }
  }, []);

  return (
    <AccountNoticeContext.Provider value={{ active, open: active && !accepted, accept }}>
      {children}
    </AccountNoticeContext.Provider>
  );
}
