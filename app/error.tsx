"use client";
import { useEffect } from 'react';

/**
 * Si algo falla al mostrar una página, en vez de la pantalla de error de
 * Next ("Application error") se ve esto, con un botón que recarga. Si el error
 * es por una versión vieja de la web (después de un deploy), recarga sola.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (/ChunkLoadError|Loading chunk|dynamically imported module/i.test(`${error?.name} ${error?.message}`)) {
      try {
        const last = Number(sessionStorage.getItem('tk_chunk_reload_at') || 0);
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem('tk_chunk_reload_at', String(Date.now()));
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <section className="bleed tile-light -mt-3 md:-mt-8 -mb-3 md:-mb-8">
      <div className="tile-inner py-20 md:py-28 text-center">
        <h1 className="t-display">No se pudo cargar esta página.</h1>
        <p className="t-tagline mt-3 text-[#6e6e73]">Suele pasar con la conexión. Probá de nuevo.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="btn-apple">
            Recargar
          </button>
          <button type="button" onClick={reset} className="btn-apple-ghost">
            Reintentar
          </button>
        </div>
      </div>
    </section>
  );
}
