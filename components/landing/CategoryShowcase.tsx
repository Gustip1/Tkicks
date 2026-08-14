import Link from 'next/link';
import Image from 'next/image';

export const CATEGORY_TILES = [
  { label: 'Remeras',    sub: 'remeras',    href: '/productos?streetwear&sub=remeras' },
  { label: 'Hoodies',    sub: 'hoodies',    href: '/productos?streetwear&sub=hoodies' },
  { label: 'Pantalones', sub: 'pantalones', href: '/productos?streetwear&sub=pantalones' },
  { label: 'Sneakers',   sub: 'sneakers',   href: '/productos?sneakers' },
] as const;

export type CategoryTileConfig = { sub: string; label?: string; url?: string };

/**
 * Server component: recibe las imágenes ya resueltas por app/page.tsx
 * (config del admin + fallback a la última foto de producto) — sin fetch
 * propio en el cliente.
 */
function CategoryTile({ c, images, className }: { c: (typeof CATEGORY_TILES)[number]; images: Record<string, string>; className?: string }) {
  return (
    <Link href={c.href} className={`group block ${className ?? ''}`}>
      <div className="relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden bg-gray-100 rounded-2xl border-2 border-gray-900">
        {images[c.sub] ? (
          <Image
            src={images[c.sub]}
            alt={c.label}
            fill
            sizes="(max-width: 640px) 45vw, 33vw"
            quality={90}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
        )}

        {/* Etiqueta superpuesta — un solo bloque visual grande, no una fila chica debajo */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pt-10 pb-2.5 sm:pb-3.5 px-1.5">
          <h3 className="text-base sm:text-xl md:text-2xl font-black text-white uppercase tracking-tight truncate text-center">
            {c.label}
          </h3>
        </div>
      </div>
    </Link>
  );
}

export function CategoryShowcase({ images }: { images: Record<string, string> }) {
  return (
    <section className="bg-white pt-6 pb-12 md:pt-8 md:pb-16">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4">
        {/* Grilla fija (sin deslizar): 2×2 en mobile con tiles grandes,
            4 en fila en desktop/tablet donde entran cómodas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {CATEGORY_TILES.map((c) => (
            <CategoryTile key={c.sub} c={c} images={images} />
          ))}
        </div>
      </div>
    </section>
  );
}
