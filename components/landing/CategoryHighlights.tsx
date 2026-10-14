import Link from 'next/link';
import Image from 'next/image';
import { CATEGORY_TILES } from './CategoryShowcase';

/**
 * Categorías en fila con foto, arriba de los productos.
 *
 * El 80% de la gente llega desde la app de Instagram y un tercio se iba de la
 * portada en menos de 5 segundos sin ver un solo producto (las categorías en
 * fotos grandes ocupaban la pantalla entera). En celular la fila mide ~100px y
 * deja ver los productos debajo; en escritorio las fotos son grandes. Antes
 * eran círculos tipo historias, pero recortaban demasiado la foto.
 */
export function CategoryHighlights({
  images,
  offersImage,
}: {
  images: Record<string, string>;
  /** Foto de un producto en oferta; si no hay ofertas, no aparece el círculo */
  offersImage?: string | null;
}) {
  const items = [
    ...CATEGORY_TILES.map((c) => ({ label: c.label, href: c.href, image: images[c.sub] ?? null, accent: false })),
    ...(offersImage ? [{ label: 'Ofertas', href: '/ofertas', image: offersImage, accent: true }] : []),
  ];

  return (
    <nav aria-label="Categorías" className="bleed tile-light">
      <ul className="tile-inner flex gap-3 md:gap-5 overflow-x-auto md:justify-center pt-1 pb-5 md:pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => (
          <li key={it.label} className="shrink-0">
            <Link
              href={it.href}
              className="group flex w-[76px] md:w-[150px] lg:w-[176px] flex-col items-center gap-1.5 md:gap-2.5 active:scale-[0.97] transition-transform duration-100"
            >
              {/* Cuadrado con esquinas suaves: la foto se ve entera, sin el anillo
                  de las historias que la achicaba. Ofertas lleva un borde rojo.
                  Varias fotos traen bandas blancas: con multiply se funden con el
                  gris del cuadrado (como en las tarjetas de producto) y el zoom
                  leve las recorta, así todos se leen como el mismo cuadrado. */}
              <span
                className={`relative block h-[76px] w-[76px] md:h-[150px] md:w-[150px] lg:h-[176px] lg:w-[176px] overflow-hidden rounded-[14px] md:rounded-[20px] bg-parchment ${
                  it.accent ? 'ring-2 ring-red-500 ring-offset-2' : ''
                }`}
              >
                {it.image && (
                  <Image
                    src={it.image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 76px, 176px"
                    className="object-cover mix-blend-multiply scale-[1.12] transition-transform duration-500 ease-apple group-hover:scale-[1.17]"
                  />
                )}
              </span>
              <span className={`text-[12px] md:text-[15px] font-semibold ${it.accent ? 'text-red-600' : 'text-gray-900'}`}>
                {it.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
