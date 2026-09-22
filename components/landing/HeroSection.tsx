import Link from 'next/link';
import Image from 'next/image';
import { HeroContent, DEFAULT_HERO_CONTENT } from '@/lib/homeContent';

export interface HeroProduct {
  slug: string;
  title: string;
  imageUrl: string;
}

/**
 * Hero de la home como un "product tile" de apple.com: franja blanca a todo
 * el ancho, titular enorme centrado, bajada, dos píldoras y el producto en
 * grande debajo. Los textos se editan desde /admin/portada; las fotos son
 * los últimos ingresos.
 *
 * Entra con la secuencia de carga de Apple (el texto sube, las fotos se
 * asientan) y las fotos hacen zoom suave al scrollear.
 */
export function HeroSection({
  content = DEFAULT_HERO_CONTENT,
  products = [],
}: {
  content?: HeroContent;
  products?: HeroProduct[];
}) {
  const shown = products.slice(0, 3);

  return (
    <section className="bleed tile-light -mt-3 md:-mt-8 overflow-hidden">
      <div className="tile-inner pt-14 md:pt-20 pb-12 md:pb-16 text-center">
        <p className="hero-rise t-tagline text-gray-600">{content.badge}</p>

        <h1 className="hero-rise hero-d1 t-hero mt-2 max-w-[18ch] mx-auto">
          {content.headlinePre}
          {content.headlineHighlight}
          {content.headlinePost}
        </h1>

        <p className="hero-rise hero-d2 t-lead text-gray-600 mt-4 max-w-[34ch] mx-auto">
          {content.subtitlePre}
          <span className="text-gray-900">{content.subtitleBold}</span>
          {content.subtitlePost}
        </p>

        <div className="hero-rise hero-d3 mt-7 flex flex-wrap items-center justify-center gap-3.5">
          <Link href={content.ctaPrimaryHref} className="btn-apple">
            {content.ctaPrimaryLabel}
          </Link>
          <Link href={content.ctaSecondaryHref} className="btn-apple-ghost">
            {content.ctaSecondaryLabel}
          </Link>
        </div>

        <p className="hero-rise hero-d4 t-caption text-gray-500 mt-5">
          {[content.trustPill1, content.trustPill2].filter(Boolean).join(' · ')}
        </p>
      </div>

      {shown.length > 0 && (
        <div className="tile-inner pb-16 md:pb-24">
          <div
            className={`hero-settle hero-d2 grid gap-3 md:gap-5 mx-auto max-w-[1100px] ${
              shown.length === 1 ? 'grid-cols-1 max-w-[560px]' : shown.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
            }`}
          >
            {shown.map((p, i) => (
              <Link
                key={p.slug}
                href={`/producto/${p.slug}`}
                aria-label={p.title}
                // En desktop la foto del medio sube un poco: arma una composición, no una fila de miniaturas
                className={`group relative block overflow-hidden rounded-lg bg-parchment aspect-[4/5] ${
                  shown.length === 3 && i === 1 ? 'md:-translate-y-6' : ''
                }`}
              >
                {/* El zoom de scroll va en un contenedor y el de hover en la imagen:
                    los dos usan transform y en el mismo elemento se pisarían. El
                    contenedor lleva el gris porque su transform crea una capa propia,
                    y el mix-blend de la foto sólo se funde con lo que hay en esa capa. */}
                <div className="scroll-zoom absolute inset-0 bg-parchment">
                  <Image
                    src={p.imageUrl}
                    alt={p.title}
                    fill
                    priority={i < 2}
                    sizes="(max-width: 768px) 33vw, 360px"
                    className="object-contain mix-blend-multiply p-1.5 md:p-6 transition-transform duration-700 ease-apple group-hover:scale-[1.04]"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
