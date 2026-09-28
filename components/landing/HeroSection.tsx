import Link from 'next/link';
import { HeroContent, DEFAULT_HERO_CONTENT } from '@/lib/homeContent';

/**
 * Hero de la home: sólo la marca, en tres niveles claros —como los heroes de
 * apple.com—:
 *   1. arriba, chico y en gris, dónde estamos ("Stock exclusivo · San Juan")
 *   2. el titular, cortado a propósito en dos renglones
 *   3. las dos píldoras
 * Todo en el mismo peso (600) para que sea una sola voz; lo que cambia es el
 * tamaño y el color. Los textos se editan desde /admin/portada.
 */
export function HeroSection({ content = DEFAULT_HERO_CONTENT }: { content?: HeroContent }) {
  // "Sneakers & Streetwear" en un renglón y "originales." en el otro: el corte
  // cae entre el destacado y el cierre, así nunca queda una palabra suelta.
  const line1 = `${content.headlinePre}${content.headlineHighlight}`.trim();
  const line2 = content.headlinePost.trim();

  return (
    <section className="bleed tile-light -mt-3 md:-mt-8">
      <div className="tile-inner pt-14 md:pt-20 pb-12 md:pb-16 text-center">
        {content.badge && (
          <p className="hero-rise t-tagline text-[#6e6e73]">{content.badge}</p>
        )}

        <h1 className="hero-rise hero-d1 t-hero mt-3 md:mt-4">
          <span className="block">{line1}</span>
          {line2 && <span className="block">{line2}</span>}
        </h1>

        <div className="hero-rise hero-d2 mt-7 md:mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href={content.ctaPrimaryHref} className="btn-apple">
            {content.ctaPrimaryLabel}
          </Link>
          <Link href={content.ctaSecondaryHref} className="btn-apple-ghost">
            {content.ctaSecondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
