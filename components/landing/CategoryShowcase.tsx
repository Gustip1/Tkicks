import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export const CATEGORY_TILES = [
  { label: 'Remeras',    sub: 'remeras',    href: '/productos?streetwear&sub=remeras' },
  { label: 'Hoodies',    sub: 'hoodies',    href: '/productos?streetwear&sub=hoodies' },
  { label: 'Pantalones', sub: 'pantalones', href: '/productos?streetwear&sub=pantalones' },
  { label: 'Sneakers',   sub: 'sneakers',   href: '/productos?sneakers' },
] as const;

export type CategoryTileConfig = { sub: string; label?: string; url?: string };

type Tile = (typeof CATEGORY_TILES)[number];

/**
 * Server component: recibe las imágenes ya resueltas por app/page.tsx
 * (config del admin + fallback a la última foto de producto) — sin fetch
 * propio en el cliente.
 *
 * El contenedor (className) define el tamaño: en mobile las filas del bento
 * dan la altura y acá solo se llena; en desktop se pasa el aspect ratio.
 */
function CategoryTile({
  c,
  images,
  className,
  imgSizes,
}: {
  c: Tile;
  images: Record<string, string>;
  className?: string;
  imgSizes: string;
}) {
  return (
    <Link
      href={c.href}
      data-reveal=""
      className={cn(
        'group relative block overflow-hidden rounded-lg bg-gray-200 active:scale-[0.98] transition-transform duration-200 ease-apple',
        className
      )}
    >
      {images[c.sub] && (
        <Image
          src={images[c.sub]}
          alt={c.label}
          fill
          sizes={imgSizes}
          quality={90}
          className="object-cover transition-transform duration-[1200ms] ease-apple group-hover:scale-[1.04]"
        />
      )}

      {/* Velo sólo abajo, para que la etiqueta lea sobre cualquier foto */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-white">
        <h3 className="t-tagline">{c.label}</h3>
        <p className="t-caption text-white/80 mt-0.5 group-hover:text-white transition-colors">Comprar ›</p>
      </div>
    </Link>
  );
}

export function CategoryShowcase({ images }: { images: Record<string, string> }) {
  const bySub = Object.fromEntries(CATEGORY_TILES.map((c) => [c.sub, c])) as Record<Tile['sub'], Tile>;

  return (
    <section className="bleed tile tile-parchment" aria-labelledby="categories-title">
      <div className="tile-inner">
        {/* Titular en dos tonos, como las góndolas de la Apple Store */}
        <h2 id="categories-title" data-reveal="" className="t-section max-w-[24ch] mb-8 md:mb-10">
          Elegí tu estilo. <span className="t-muted">Remeras, hoodies, pantalones y sneakers.</span>
        </h2>

        {/* Mobile: bento — el tile grande alterna de lado en cada fila */}
        <div className="sm:hidden space-y-3">
          <div className="flex gap-3 h-52">
            <CategoryTile c={bySub.sneakers} images={images} className="flex-[3]" imgSizes="60vw" />
            <CategoryTile c={bySub.remeras} images={images} className="flex-[2]" imgSizes="40vw" />
          </div>
          <div className="flex gap-3 h-52">
            <CategoryTile c={bySub.hoodies} images={images} className="flex-[2]" imgSizes="40vw" />
            <CategoryTile c={bySub.pantalones} images={images} className="flex-[3]" imgSizes="60vw" />
          </div>
        </div>

        {/* Desktop / tablet: las 4 en fila */}
        <div className="hidden sm:grid grid-cols-4 gap-4 md:gap-5">
          {CATEGORY_TILES.map((c) => (
            <CategoryTile key={c.sub} c={c} images={images} className="aspect-[3/4]" imgSizes="25vw" />
          ))}
        </div>
      </div>
    </section>
  );
}
