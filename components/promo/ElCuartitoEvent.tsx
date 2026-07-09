"use client";
import { ArrowUpRight, Ticket } from 'lucide-react';

const TICKETS_URL = 'https://www.passline.com/eventos/el-cuartito-san-juan-dia-del-amigo';

/** Logo oficial de El Cuartito (ojo de cerradura), vectorizado — hereda el color via currentColor */
function CuartitoLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 118.05 176.83" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <g transform="matrix(0.13333333,0,0,-0.13333333,-107.64361,188.41623)">
        <path
          fill="currentColor"
          d="m 1494.75,681.059 c 0.89,3.168 1.75,6.293 2.61,9.48 53.7,45.149 95.56,103.836 120.47,170.793 h -140.68 c -4.66,0 -8.9,-2.441 -11.42,-6.344 -28.77,-44.664 -69.99,-80.562 -118.92,-102.543 0.13,-0.386 0.26,-0.754 0.38,-1.113 -5.1,-2.422 -7.8,-8.133 -6.35,-13.625 L 1513.87,233.539 H 979.141 l 169.509,486.219 c 3.24,11.785 -3.08,24.199 -14.6,28.226 -5.33,1.875 -10.58,3.95 -15.82,6.063 -101.3,47.008 -169.257,153.633 -158.441,274.943 11.379,127.8 113.151,232.97 240.561,248.19 86.86,10.36 166.73,-19.89 223.6,-74.08 5.36,-5.14 12.32,-8.15 19.76,-8.15 h 152.38 c -76.04,143.68 -235.04,236.7 -413.26,215.05 -180.03,-21.9 -326.857,-164.32 -353.447,-343.71 -24.199,-163.27 48.203,-311.36 168.461,-396.454 1.703,-3.106 2.386,-6.727 1.441,-10.324 L 808.48,130.359 c -5.773,-22 10.864,-43.5387 33.618,-43.4801 l 818.922,1.6797 c 20.77,0.043 35.87,19.7034 30.59,39.7814 l -196.86,552.719"
        />
      </g>
    </svg>
  );
}

const MARQUEE_ITEMS = [
  'EL CUARTITO',
  'DÍA DEL AMIGO',
  'SAN JUAN',
  'ENTRADAS DISPONIBLES',
  'TKICKS × EL CUARTITO',
];

export function ElCuartitoEvent() {
  return (
    <section className="bg-white py-10 md:py-16">
      <div className="max-w-[1400px] mx-auto px-4">
        <a
          href={TICKETS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="El Cuartito — Día del Amigo en San Juan: comprá tu entrada en Passline"
          className="group relative block overflow-hidden rounded-3xl bg-[#0a0a0a] border border-white/10 transition-all duration-500 hover:border-orange-500/40 hover:shadow-[0_20px_80px_-20px_rgba(249,115,22,0.35)]"
        >
          {/* Textura + luces del cuartito */}
          <div className="absolute inset-0 hero-noise opacity-[0.06] pointer-events-none" />
          <div className="absolute -top-24 -right-16 w-72 h-72 md:w-96 md:h-96 rounded-full bg-orange-500/25 blur-3xl animate-cuartito-glow pointer-events-none" />
          <div className="absolute -bottom-32 -left-20 w-72 h-72 rounded-full bg-orange-600/15 blur-3xl animate-cuartito-glow animation-delay-2000 pointer-events-none" />

          {/* Marquee superior estilo flyer */}
          <div className="relative border-b border-white/10 overflow-hidden">
            <div className="animate-cuartito-marquee whitespace-nowrap py-2 will-change-transform">
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
                <span
                  key={idx}
                  className="font-cuartito inline-block mx-4 text-[10px] md:text-xs font-bold tracking-[0.25em] text-orange-400/90 uppercase"
                >
                  {item} <span className="text-white/25 ml-8">✦</span>
                </span>
              ))}
            </div>
          </div>

          <div className="relative grid md:grid-cols-[1fr_auto] items-center gap-8 md:gap-14 px-6 py-10 md:px-14 md:py-14">
            {/* Texto */}
            <div className="text-center md:text-left order-2 md:order-1">
              <p className="font-cuartito inline-flex items-center gap-2 text-[11px] md:text-xs font-bold uppercase tracking-[0.3em] text-orange-400 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
                Próximo evento
              </p>

              <h2 className="font-cuartito text-4xl md:text-6xl font-extrabold text-white leading-[0.95] tracking-tight">
                El Cuartito
              </h2>
              <p className="font-cuartito mt-2 text-lg md:text-2xl font-bold text-orange-400 uppercase tracking-tight">
                Día del Amigo · San Juan
              </p>

              <p className="mt-4 max-w-md mx-auto md:mx-0 text-sm md:text-base text-white/60 font-medium leading-relaxed">
                La casa que abre puertas. Juntá a tu gente, vestite con Tkicks y
                caé al cuartito — las entradas vuelan.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row items-center md:items-start gap-3 justify-center md:justify-start">
                <span className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-orange-500 text-black text-sm font-black uppercase tracking-tight rounded-full transition-all duration-300 group-hover:bg-orange-400 group-hover:scale-[1.03] group-active:scale-[0.98] shadow-lg shadow-orange-500/25">
                  <Ticket className="w-4 h-4" />
                  Conseguí tu entrada
                  <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
                <span className="inline-flex items-center px-4 py-4 text-xs font-bold text-white/40 uppercase tracking-widest">
                  vía Passline
                </span>
              </div>
            </div>

            {/* Logo: la llave de la fiesta */}
            <div className="relative flex items-center justify-center order-1 md:order-2 md:pr-6">
              {/* Luz que sale por la cerradura */}
              <div className="absolute w-44 h-44 md:w-64 md:h-64 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.45)_0%,rgba(249,115,22,0)_70%)] animate-cuartito-glow" />
              <CuartitoLogo className="relative h-36 md:h-52 w-auto text-white drop-shadow-[0_0_25px_rgba(249,115,22,0.35)] transition-transform duration-500 ease-out group-hover:scale-105 group-hover:-rotate-6" />
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
