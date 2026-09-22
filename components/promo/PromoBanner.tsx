"use client";
import { trackEvent } from '@/lib/analytics/track';
import { PromoBannerContent } from '@/lib/homeContent';

/**
 * Banner promocional genérico configurable desde /admin/portada (settings.homepage_banner).
 * Reemplaza el banner de El Cuartito que estaba hardcodeado: ahora cualquier campaña futura
 * se activa editando texto, sin tocar código.
 */
export function PromoBanner({ content }: { content: PromoBannerContent }) {
  if (!content.enabled || !content.title.trim() || !content.ctaHref.trim()) return null;

  return (
    // Franja negra a todo el ancho, como los anuncios de campaña de apple.com
    <section className="bleed tile tile-black text-center" aria-label={content.title}>
      <div className="tile-inner" data-reveal="">
        {content.eyebrow && <p className="t-tagline text-[#86868b]">{content.eyebrow}</p>}
        <h2 className="t-display mt-2 max-w-[20ch] mx-auto">{content.title}</h2>
        {content.subtitle && <p className="t-lead text-[#86868b] mt-3 max-w-[32ch] mx-auto">{content.subtitle}</p>}
        {content.ctaLabel && (
          <div className="mt-7">
            <a
              href={content.ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('homepage_banner_click', 'promo', { href: content.ctaHref })}
              className="btn-apple"
            >
              {content.ctaLabel}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
