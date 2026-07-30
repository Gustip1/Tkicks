import Link from 'next/link';
import Image from 'next/image';

export const CATEGORY_TILES = [
  { label: 'Remeras',    sub: 'remeras' },
  { label: 'Hoodies',    sub: 'hoodies' },
  { label: 'Pantalones', sub: 'pantalones' },
] as const;

export type CategoryTileConfig = { sub: string; label?: string; url?: string };

/**
 * Server component: recibe las imágenes ya resueltas por app/page.tsx
 * (config del admin + fallback a la última foto de producto) — sin fetch
 * propio en el cliente.
 */
export function CategoryShowcase({ images }: { images: Record<string, string> }) {
  return (
    <section className="bg-white pt-6 pb-12 md:pt-8 md:pb-16">
      <div className="max-w-[1400px] mx-auto px-1.5 sm:px-4">
        {/* Grilla editorial — accesos directos a categorías (3 en fila, también en mobile) */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-4 md:gap-6">
          {CATEGORY_TILES.map((c) => (
            <Link
              key={c.sub}
              href={`/productos?streetwear&sub=${c.sub}`}
              className="group block"
            >
              <div className="relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden bg-gray-100 rounded-2xl border-2 border-gray-900">
                {images[c.sub] ? (
                  <Image
                    src={images[c.sub]}
                    alt={c.label}
                    fill
                    sizes="(max-width: 640px) 33vw, 33vw"
                    quality={90}
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
                )}

                {/* Etiqueta superpuesta — un solo bloque visual grande, no una fila chica debajo */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pt-10 pb-2.5 sm:pb-3.5 px-1.5">
                  <h3 className="text-[13px] sm:text-xl md:text-2xl font-black text-white uppercase tracking-tight truncate text-center">
                    {c.label}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
