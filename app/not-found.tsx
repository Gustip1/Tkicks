import Link from 'next/link';

/**
 * Página para links rotos. Antes aparecía la pantalla genérica de Next
 * ("404 | This page could not be found"), en inglés y sin salida.
 */
export default function NotFound() {
  return (
    <section className="bleed tile-light -mt-3 md:-mt-8 -mb-3 md:-mb-8">
      <div className="tile-inner py-24 md:py-32 text-center">
        <h1 className="t-display max-w-[18ch] mx-auto">No encontramos esta página.</h1>
        <p className="t-tagline mt-3 text-[#6e6e73]">Puede que el link sea viejo o que el producto ya se haya vendido.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/productos" className="btn-apple">
            Ver catálogo
          </Link>
          <Link href="/" className="btn-apple-ghost">
            Ir al inicio
          </Link>
        </div>
      </div>
    </section>
  );
}
