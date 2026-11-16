import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { FAQ, FaqItem } from '@/lib/trust';

/** Lista de preguntas que se abren y cierran. Funciona sin JavaScript (<details>). */
export function FaqList({ items = FAQ }: { items?: FaqItem[] }) {
  return (
    <div className="border-t border-[#d6d6d6]">
      {items.map((f) => (
        <details key={f.id} className="faq-item group border-b border-[#d6d6d6]">
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-semibold leading-snug tracking-[-0.02em] text-gray-900 [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDown
              className="h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 ease-apple group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="pb-5 pr-9 t-body text-gray-600">
            <p>{f.a}</p>
            {f.link && (
              <Link href={f.link.href} className="link-apple mt-2 inline-flex">
                {f.link.label}
              </Link>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

/**
 * Preguntas frecuentes en la portada: lo que se pregunta quien nunca nos
 * compró (¿es original?, ¿me llega?, ¿tiene cambio?), respondido sin vueltas.
 */
export function Faq() {
  return (
    <section id="preguntas" className="bleed tile tile-parchment scroll-mt-16" aria-labelledby="faq-title">
      <div className="tile-inner">
        <div className="mx-auto max-w-[760px]">
          <h2 id="faq-title" className="t-section mb-6 md:mb-9">
            Preguntas frecuentes
          </h2>
          <FaqList />
        </div>
      </div>
    </section>
  );
}
