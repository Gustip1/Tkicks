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
    <section className="py-8 bg-black">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.title} 
              className="flex flex-col items-center text-center p-6 bg-black transition-all group"
            >
              <div className={`w-14 h-14 rounded-xl ${item.color} border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-white mb-1 uppercase tracking-tight">{item.title}</h3>
              <p className="text-xs text-gray-400 font-bold">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
