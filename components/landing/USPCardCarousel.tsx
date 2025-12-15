"use client";
import { Shield, Truck, CreditCard } from 'lucide-react';

const items = [
  { 
    title: 'Envío a todo el país', 
    desc: 'Llegamos a donde estés',
    icon: Truck,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/50'
  },
  { 
    title: '3 cuotas sin interés', 
    desc: 'Con tarjetas bancarias',
    icon: CreditCard,
    color: 'bg-green-500/20 text-green-400 border-green-500/50'
  },
  { 
    title: '100% Originales', 
    desc: 'Garantía de autenticidad',
    icon: Shield,
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/50'
  }
];

export function USPCardCarousel() {
  return (
    <section className="py-6 md:py-10 bg-black border-t border-b border-white/5" aria-labelledby="beneficios-title">
      <div className="max-w-[1600px] mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="beneficios-title" className="text-sm md:text-lg font-black uppercase tracking-tight text-white">
            Beneficios Tkicks
          </h2>
          <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full bg-white/5 text-xs font-bold text-white border border-white/10">
            Dark mode friendly
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory [-mx-4] px-4 md:mx-0 md:px-0">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex flex-col items-start md:items-center text-left md:text-center p-4 md:p-6 bg-gradient-to-br from-zinc-950 to-black rounded-xl border border-zinc-800 transition-all group snap-center min-w-[240px]"
              >
                <div className={`w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl ${item.color} border flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <h3 className="text-xs md:text-base font-black text-white mb-1 uppercase tracking-tight leading-tight">
                  {item.title}
                </h3>
                <p className="text-[11px] md:text-sm text-gray-400 font-bold">
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
 