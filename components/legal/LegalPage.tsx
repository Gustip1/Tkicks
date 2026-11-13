import Link from 'next/link';
import { ReactNode } from 'react';

/** Desde cuándo valen los textos legales. Cambiarla cada vez que se editen. */
export const LEGAL_UPDATED = '13 de noviembre de 2026';

export const LEGAL_WHATSAPP = 'https://api.whatsapp.com/send?phone=5492644802994';

/**
 * Página de texto legal (términos, privacidad): una columna angosta para leer
 * cómodo, índice arriba y secciones con ancla, como las páginas legales de
 * apple.com.
 */
export function LegalPage({
  title,
  intro,
  sections,
  other,
}: {
  title: string;
  intro: ReactNode;
  sections: { id: string; title: string; body: ReactNode }[];
  /** La otra página legal, para pasar de una a otra */
  other: { href: string; label: string };
}) {
  return (
    <article className="mx-auto max-w-[680px] px-3 py-6 md:py-12">
      <h1 className="t-display text-gray-900">{title}</h1>
      <p className="mt-2 t-caption text-gray-500">Vigentes desde el {LEGAL_UPDATED}</p>
      <div className="mt-5 t-body text-gray-700">{intro}</div>

      <nav aria-label="Contenido" className="mt-7 rounded-2xl bg-[#f5f5f7] p-5">
        <ol className="space-y-2 t-caption">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-primary hover:underline">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((s, i) => (
        <section key={s.id} id={s.id} className="scroll-mt-24 pt-9 md:pt-11">
          <h2 className="t-tagline text-gray-900">
            {i + 1}. {s.title}
          </h2>
          <div className="legal-body mt-3 space-y-3 t-body text-gray-700">{s.body}</div>
        </section>
      ))}

      <p className="mt-12 border-t border-gray-200 pt-6 t-caption text-gray-600">
        ¿Dudas? Escribinos por{' '}
        <a href={LEGAL_WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          WhatsApp
        </a>
        . También podés leer {other.label === 'Términos y condiciones' ? 'los' : 'la'}{' '}
        <Link href={other.href} className="text-primary hover:underline">
          {other.label}
        </Link>
        .
      </p>
    </article>
  );
}

/** Lista con viñetas para los textos legales */
export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-gray-400">{children}</ul>;
}

/** Lo que no puede pasar desapercibido: sin cambio, sin reembolso */
export function LegalCallout({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-[#f5f5f7] p-4 font-semibold text-gray-900">{children}</p>;
}
