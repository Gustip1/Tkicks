"use client";
import { useEffect } from 'react';

/**
 * Después de cada deploy, quien ya tenía la web abierta sigue con la versión
 * vieja: al navegar, el navegador pide archivos de JavaScript que ya no
 * existen y la página queda rota hasta recargar a mano. Acá se detecta ese
 * error puntual y se recarga sola, una vez (si vuelve a fallar en menos de un
 * minuto no insiste, para no entrar en un bucle).
 */
const KEY = 'tk_chunk_reload_at';
const STALE = /ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed/i;

function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* sin sessionStorage: se recarga igual */
  }
  window.location.reload();
}

export function StaleDeployReload() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (STALE.test(String(e.message || e.error?.message || e.error?.name || ''))) reloadOnce();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      if (STALE.test(String(r?.message || r?.name || r || ''))) reloadOnce();
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
