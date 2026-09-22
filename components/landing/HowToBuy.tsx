"use client";
import Link from 'next/link';
import { HowToBuyContent, DEFAULT_HOW_TO_BUY_CONTENT } from '@/lib/homeContent';

export function HowToBuy({ content = DEFAULT_HOW_TO_BUY_CONTENT }: { content?: HowToBuyContent }) {
  const steps = content.steps.length > 0 ? content.steps : DEFAULT_HOW_TO_BUY_CONTENT.steps;
  const whatsappHref = `https://api.whatsapp.com/send?phone=${content.whatsappNumber}&text=${encodeURIComponent(content.whatsappMessage)}`;

  return (
    <section id="como-comprar" className="bleed tile tile-light scroll-mt-16" aria-labelledby="how-to-buy-title">
      <div className="tile-inner">
        <div className="text-center mb-10 md:mb-14" data-reveal="">
          <h2 id="how-to-buy-title" className="t-display">Comprar es simple.</h2>
          <p className="t-lead text-gray-600 mt-3">Tres pasos y tu pedido sale.</p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 max-w-[1100px] mx-auto">
          {steps.map((step, i) => (
            <li key={i} data-reveal="" className="rounded-lg bg-parchment p-7 md:p-8 flex flex-col gap-3">
              <p className="t-caption font-semibold text-gray-500">Paso {i + 1}</p>
              <h3 className="t-tagline">{step.title}</h3>
              <p className="t-body text-gray-600">{step.desc}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3.5" data-reveal="">
          <Link href="/productos" className="btn-apple">
            Ver catálogo
          </Link>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-apple-ghost">
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
