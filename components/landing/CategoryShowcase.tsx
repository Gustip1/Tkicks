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

/** Orden en el celular: arriba lo que más se busca; abajo a la derecha el
 *  nombre más corto, que es la esquina donde flota el botón de WhatsApp */
const MOBILE_ORDER: Tile['sub'][] = ['sneakers', 'remeras', 'pantalones', 'hoodies'];

/**
 * Server component: recibe las imágenes ya resueltas por app/page.tsx
 * (config del admin + fallback a la última foto de producto) — sin fetch
 * propio en el cliente.
 *
 * El contenedor (className) define el tamaño y la proporción.
 */
function CategoryTile({
  c,
  images,
  className,
  imgSizes,
  priority,
  compact,
}: {
  c: Tile;
  images: Record<string, string>;
  className?: string;
  imgSizes: string;
  priority?: boolean;
  /** Celular: solo el nombre, sin el "Comprar ›", y la foto encuadrada un poco
   *  más abajo que el borde de arriba (el mosaico es apaisado y si no corta la prenda) */
  compact?: boolean;
}) {
  return (
    <Link
      href={c.href}
      prefetch={false}
      data-reveal="clip"
      className={cn(
        'group relative block overflow-hidden rounded-3xl bg-gray-200 active:scale-[0.98] transition-transform duration-200 ease-apple',
        className
      )}
    >
      {images[c.sub] && (
        <Image
          src={images[c.sub]}
          alt={c.label}
          fill
          sizes={imgSizes}
          priority={priority}
          className={cn('object-cover transition-transform duration-[1200ms] ease-apple group-hover:scale-[1.04]', compact ? 'object-[center_18%]' : 'object-top')}
        />
      )}

      {/* Velo sólo abajo, para que la etiqueta lea sobre cualquier foto */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />

      <div className={cn('absolute inset-x-0 bottom-0 text-white', compact ? 'px-3.5 pb-3' : 'p-4 sm:p-5')}>
        <h3 className={compact ? 'text-[17px] font-semibold leading-tight tracking-[-0.01em]' : 't-tagline'}>{c.label}</h3>
        {!compact && (
          <p className="t-caption text-white/80 mt-0.5 group-hover:text-white transition-colors">Comprar ›</p>
        )}
      </div>
    </Link>
  );
}

export function CategoryShowcase({ images }: { images: Record<string, string> }) {
  const bySub = Object.fromEntries(CATEGORY_TILES.map((c) => [c.sub, c])) as Record<Tile['sub'], Tile>;

  // En el celular van las cuatro a la vista, en una grilla pareja de dos por
  // dos que entra completa en la primera pantalla. Se probó una fila que se
  // deslizaba de costado (nov 2026) y el dueño la descartó: el cliente no tiene
  // que deslizar para ver las categorías, y quedaba tosca.
  return (
    <section
      className="bleed tile tile-parchment max-sm:!pt-6 max-sm:!pb-7 sm:!pt-8 md:!pt-14"
      aria-labelledby="categories-title"
    >
      <div className="tile-inner">
        {/* Titular directo, de un solo tono (regla del dueño) */}
        <h2 id="categories-title" className="t-section mb-4 md:mb-8">
          Elegí tu estilo
        </h2>

        {/* Celular: se piden antes que el resto (priority) y en 50vw, para que un
            celular 3x use la miniatura de 640: 30 KB en vez de 100 por foto. */}
        <div className="sm:hidden grid grid-cols-2 gap-2.5">
          {MOBILE_ORDER.map((sub) => (
            <CategoryTile key={sub} c={bySub[sub]} images={images} className="aspect-[6/5]" imgSizes="50vw" priority compact />
          ))}
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
