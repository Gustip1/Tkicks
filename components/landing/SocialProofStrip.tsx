"use client";
import { Star, MapPin, Repeat, Heart } from 'lucide-react';

const proofs = [
  {
    icon: MapPin,
    value: 'San Juan',
    label: 'Showroom físico',
  },
  {
    icon: Star,
    value: '100%',
    label: 'Originales',
  },
  {
    icon: Repeat,
    value: 'Únicos',
    label: 'y exclusivos',
  },
  {
    icon: Heart,
    value: 'Comunidad',
    label: 'Tkicks fam',
  },
];

export function SocialProofStrip() {
  return (
    <section className="bg-black border-y border-white/5 py-6 md:py-8">
      <div className="max-w-[1600px] mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {proofs.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3 md:justify-center">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-white/60" />
              </div>
              <div>
                <p className="text-sm md:text-base font-black text-white leading-tight">{value}</p>
                <p className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
