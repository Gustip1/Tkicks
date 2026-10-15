import Link from 'next/link';
import { HeroContent, DEFAULT_HERO_CONTENT } from '@/lib/homeContent';

/**
 * Hero de la home, compacto: presenta la marca y deja ver los productos.
 *
 * Antes ocupaba media pantalla de celular (titular de 34px, aire arriba y
 * abajo, botones grandes) y la gente tenía que bajar para encontrar algo que
 * comprar. Ahora mide unos 190px: titular chico, dónde estamos en una línea
 * gris y las dos píldoras; las categorías con fotos ya asoman debajo.
 *
 * El titular se muestra con mayúscula solo al principio (como apple.com),
 * aunque en /admin/portada esté escrito "Sneakers & Streetwear".
 */

/** "Sneakers & Streetwear originales." → "Sneakers & streetwear originales."
 *  Respeta siglas (USA, NBA) y palabras con números (AJ1). */
function sentenceCase(text: string) {
  let first = true;
  return text.replace(/\S+/g, (word) => {
    if (first) {
      first = false;
      return word;
    }
    const isAcronym = word.length > 1 && word === word.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(word);
    return isAcronym || /\d/.test(word) ? word : word.toLowerCase();
  });
}

export function HeroSection({ content = DEFAULT_HERO_CONTENT }: { content?: HeroContent }) {
  // "&" va pegado a la palabra siguiente: nunca queda "Sneakers &" solo en un renglón
  const headline = sentenceCase(
    `${content.headlinePre}${content.headlineHighlight}${content.headlinePost}`.replace(/\s+/g, ' ').trim()
  ).replace(/ & /g, '\u00a0&\u00a0');

  return (
    <section className="bleed tile-light -mt-3 md:-mt-8">
      <div className="tile-inner pt-7 pb-6 md:pt-12 md:pb-10 text-center">
        {/* El momento de la página: el titular sube desde atrás de una máscara */}
        <h1 className="t-hero-compact">
          <span className="hero-line"><span>{headline}</span></span>
        </h1>

        {content.badge && (
          <p className="hero-rise hero-d3 t-caption mt-1.5 md:mt-2 text-[#6e6e73]">{content.badge}</p>
        )}

        <div className="hero-rise hero-d4 mt-4 md:mt-6 flex items-center justify-center gap-2.5">
          <Link href={content.ctaPrimaryHref} className="btn-apple btn-apple-sm">
            {content.ctaPrimaryLabel}
          </Link>
          <Link href={content.ctaSecondaryHref} className="btn-apple-ghost btn-apple-sm">
            {content.ctaSecondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
