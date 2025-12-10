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
    <section className="py-6 bg-black">
      <div className="grid grid-cols-3 gap-3 md:gap-8">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.title} 
              className="flex flex-col items-center text-center p-3 md:p-6 bg-black transition-all group"
            >
              <div className={`w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl ${item.color} border flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 md:w-7 md:h-7" />
              </div>
              <h3 className="text-[10px] md:text-base font-black text-white mb-0.5 md:mb-1 uppercase tracking-tight leading-tight">{item.title}</h3>
              <p className="text-[8px] md:text-xs text-gray-400 font-bold hidden md:block">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
