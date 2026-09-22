import Link from 'next/link';
import { HeroContent, DEFAULT_HERO_CONTENT } from '@/lib/homeContent';

/**
 * Hero de la home: sólo la marca. Un titular en dos tonos —el mismo
 * tratamiento que las góndolas de marca, para que toda la página hable con
 * una sola voz tipográfica— y las dos píldoras. Debajo siguen directo las
 * categorías con fotos. Los textos se editan desde /admin/portada.
 */
export function HeroSection({ content = DEFAULT_HERO_CONTENT }: { content?: HeroContent }) {
  return (
    <section className="bleed tile-light -mt-3 md:-mt-8">
      <div className="tile-inner pt-16 md:pt-24 pb-14 md:pb-20 text-center">
        <h1 className="hero-rise t-hero max-w-[20ch] mx-auto">
          {content.headlinePre}
          {content.headlineHighlight}
          {content.headlinePost}{' '}
          {content.badge && <span className="t-muted">{content.badge}.</span>}
        </h1>

        <div className="hero-rise hero-d2 mt-8 flex flex-wrap items-center justify-center gap-3.5">
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
