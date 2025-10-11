"use client";
import { cn } from '@/lib/utils';
import { DolarWidget } from '@/components/DolarWidget';

export function BannerTicker() {
  const items = [
    '3 cuotas sin interés',
    'Productos 100% originales',
    'Envíos a todo el país'
  ];
  return (
    <div className="sticky top-0 z-50 w-full bg-black text-white">
      <div className={cn('relative overflow-hidden flex items-center justify-between px-4')}
        aria-label="Ofertas y mensajes importantes"
        role="region">
        <div className="animate-marquee whitespace-nowrap py-2 will-change-transform flex-1">
          <span className="mx-6 inline-block" aria-hidden>
            {items.join(' • ')}
          </span>
          <span className="mx-6 inline-block" aria-hidden>
            {items.join(' • ')}
          </span>
        </div>
        <div className="shrink-0">
          <DolarWidget />
        </div>
      </div>
    </div>
  );
}



