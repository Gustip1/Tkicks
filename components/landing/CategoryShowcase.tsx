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

/** En el celular arranca por lo que más se busca */
const MOBILE_ORDER: Tile['sub'][] = ['sneakers', 'remeras', 'hoodies', 'pantalones'];

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
}: {
  c: Tile;
  images: Record<string, string>;
  className?: string;
  imgSizes: string;
  priority?: boolean;
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
          className="object-cover object-top transition-transform duration-[1200ms] ease-apple group-hover:scale-[1.04]"
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

  // En el celular van en una fila que se desliza, de a dos y con la tercera
  // asomando. Antes eran dos filas (bento) que llenaban la pantalla: el primer
  // producto quedaba a pantalla y media, y la mitad de las visitas a la portada
  // se iba sin bajar (nov 2026). Ahora "Recién llegados" asoma en la primera.
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

        {/* Celular: las cuatro se piden antes que el resto (priority) y en 45vw, para
            que un celular 3x use la miniatura de 640: 30 KB en vez de 100 por foto. */}
        <div className="sm:hidden -mx-[22px] snap-x snap-mandatory scroll-px-[22px] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2.5 px-[22px]">
            {MOBILE_ORDER.map((sub) => (
              <CategoryTile
                key={sub}
                c={bySub[sub]}
                images={images}
                className="aspect-square w-[42vw] max-w-[200px] shrink-0 snap-start"
                imgSizes="45vw"
                priority
              />
            ))}
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
