import Link from 'next/link';
import Image from 'next/image';
import { CATEGORY_TILES } from './CategoryShowcase';

/**
 * Categorías en círculos, como las historias destacadas de Instagram.
 *
 * El 80% de la gente llega desde la app de Instagram y un tercio se iba de la
 * portada en menos de 5 segundos sin ver un solo producto (las categorías en
 * fotos grandes ocupaban la pantalla entera). Esta fila mide ~100px, es un
 * gesto que ya conocen de Instagram y deja ver los productos debajo.
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
      <ul className="tile-inner flex gap-4 md:gap-7 overflow-x-auto md:justify-center pt-1 pb-5 md:pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => (
          <li key={it.label} className="shrink-0">
            <Link href={it.href} className="group flex w-[68px] md:w-[88px] flex-col items-center gap-1.5 active:scale-[0.97] transition-transform duration-100">
              {/* Anillo como el de las historias: rojo en Ofertas, gris en el resto */}
              <span
                className={`rounded-full p-[2.5px] ${it.accent ? 'bg-red-500' : 'bg-gray-200'}`}
              >
                <span className="block rounded-full bg-white p-[2px]">
                  <span className="relative block h-[58px] w-[58px] md:h-[78px] md:w-[78px] overflow-hidden rounded-full bg-parchment">
                    {it.image && (
                      <Image
                        src={it.image}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover transition-transform duration-500 ease-apple group-hover:scale-105"
                      />
                    )}
                  </span>
                </span>
              </span>
              <span className={`text-[12px] md:text-[13px] font-semibold ${it.accent ? 'text-red-600' : 'text-gray-900'}`}>
                {it.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
