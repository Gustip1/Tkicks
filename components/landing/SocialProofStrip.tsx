"use client";
import { Star, MapPin, Repeat, Heart } from 'lucide-react';
import { SocialProofContent, DEFAULT_SOCIAL_PROOF_CONTENT } from '@/lib/homeContent';

const ICONS = [MapPin, Star, Repeat, Heart];

export function SocialProofStrip({ content = DEFAULT_SOCIAL_PROOF_CONTENT }: { content?: SocialProofContent }) {
  const items = content.items.length > 0 ? content.items : DEFAULT_SOCIAL_PROOF_CONTENT.items;

  return (
    <section className="bg-gray-50 border-y border-gray-200 py-6 md:py-8">
      <div className="max-w-[1600px] mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {items.map(({ value, label }, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <div key={i} className="flex items-center gap-3 md:justify-center">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm md:text-base font-black text-gray-900 leading-tight">{value}</p>
                  <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider">{label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
