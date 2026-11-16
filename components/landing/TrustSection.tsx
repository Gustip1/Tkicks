import Link from 'next/link';
import { CreditCard, ShieldCheck, Store, Truck } from 'lucide-react';
import { GUARANTEES, Guarantee } from '@/lib/trust';

const ICONS: Record<Guarantee['key'], typeof Truck> = {
  original: ShieldCheck,
  shipping: Truck,
  payment: CreditCard,
  showroom: Store,
};

/**
 * "Comprá tranquilo": las cuatro garantías, arriba en la portada.
 *
 * Quien llega por primera vez desde un anuncio no nos conoce; antes la
 * confianza dependía de un aviso de "se vendió hace X", que mostraba compras
 * de otros. Ahora se apoya en lo que la tienda garantiza. Franja oscura: es el
 * único bloque que no vende un producto y tiene que distinguirse.
 */
export function TrustSection() {
  return (
    <section className="bleed tile-dark py-12 md:py-[72px]" aria-labelledby="trust-title">
      <div className="tile-inner">
        <h2 id="trust-title" className="t-section text-center">
          Comprá tranquilo
        </h2>

        <ul className="mx-auto mt-8 md:mt-12 grid max-w-[1100px] grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4 md:gap-x-8">
          {GUARANTEES.map((g) => {
            const Icon = ICONS[g.key];
            return (
              <li key={g.key} data-reveal="" className="flex flex-col items-center text-center">
                <Icon className="h-7 w-7 md:h-8 md:w-8 text-white" strokeWidth={1.5} aria-hidden />
                <h3 className="mt-3.5 text-[17px] md:text-[19px] font-semibold leading-tight tracking-[-0.02em] text-white">{g.title}</h3>
                <p className="mt-1.5 max-w-[24ch] t-caption text-[#a1a1a6]">{g.text}</p>
              </li>
            );
          })}
        </ul>

        <p className="mt-9 md:mt-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 t-caption md:t-body">
          <Link href="/#preguntas" className="link-apple">
            Preguntas frecuentes
          </Link>
          <Link href="/nosotros" className="link-apple">
            Quiénes somos
          </Link>
        </p>
      </div>
    </section>
  );
}
