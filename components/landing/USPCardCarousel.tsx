"use client";
import { Shield, Truck, CreditCard, Sparkles } from 'lucide-react';

const items = [
  {
    title: 'Envío a todo el país',
    desc: 'Seguimiento en tiempo real',
    icon: Truck,
    accent: 'from-blue-500/20 to-blue-500/5',
    iconBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
  },
  {
    title: '3 cuotas sin interés',
    desc: 'Con tarjetas bancarias',
    icon: CreditCard,
    accent: 'from-emerald-500/20 to-emerald-500/5',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  },
  {
    title: '100% Originales',
    desc: 'Garantía de autenticidad',
    icon: Shield,
    accent: 'from-amber-500/20 to-amber-500/5',
    iconBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  },
];

export function USPCardCarousel() {
  return (
    <section className="relative py-8 md:py-12 bg-black border-y border-white/5" aria-labelledby="beneficios-title">
      <div className="max-w-[1600px] mx-auto px-4 space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-emerald-400/90">
              <span className="h-px w-6 bg-emerald-400/60" /> Beneficios
            </span>
            <h2 id="beneficios-title" className="mt-2 text-xl md:text-3xl font-black tracking-tight text-white">
              Por qué Tkicks
            </h2>
          </div>
          <Sparkles className="hidden md:block w-5 h-5 text-white/30" />
        </div>

        <div className="grid grid-cols-3 gap-2.5 md:gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${item.accent} p-3 md:p-6 transition-all hover:border-white/25 hover:-translate-y-0.5`}
              >
                <div className={`w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl border flex items-center justify-center mb-2 md:mb-4 ${item.iconBg} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <h3 className="text-[11px] md:text-base font-black text-white uppercase tracking-tight leading-tight">
                  {item.title}
                </h3>
                <p className="hidden md:block text-xs md:text-sm text-white/50 font-bold mt-1">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
