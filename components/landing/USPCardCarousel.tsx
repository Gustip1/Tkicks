"use client";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const items = [
  { title: 'Envío gratis', desc: 'En compras seleccionadas' },
  { title: '3 cuotas sin interés', desc: 'Con tarjetas bancarias' },
  { title: 'Productos 100% originales', desc: 'Garantía de autenticidad' }
];

export function USPCardCarousel() {
  const [ref] = useEmblaCarousel({ loop: true, align: 'start' }, [
    Autoplay({ delay: 3500, stopOnMouseEnter: true, stopOnInteraction: false })
  ]);

  return (
    <div className="overflow-hidden" ref={ref} aria-roledescription="carousel">
      <ul className="-ml-4 flex">
        {items.map((it) => (
          <li key={it.title} className="min-w-0 shrink-0 grow-0 basis-full pl-4 md:basis-1/3">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-white">{it.title}</h3>
              <p className="mt-1 text-sm text-neutral-300">{it.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}



