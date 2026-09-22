"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useInstallmentsPromo } from '@/components/InstallmentsPromoProvider';
import { DolarWidget } from '@/components/DolarWidget';

/**
 * La "ribbon" de apple.com: una franja clara debajo de la navegación con un
 * mensaje corto y un link. En lugar de una marquesina, los mensajes se turnan
 * con un fundido suave cada pocos segundos.
 */
const BASE_ITEMS = [
  { text: 'Productos 100% originales, con su comprobante de compra.', cta: 'Ver catálogo', href: '/productos' },
  { text: 'Envíos a todo el país con seguimiento.', cta: 'Cómo comprar', href: '/#como-comprar' },
];

const NORMAL_INSTALLMENT = { text: 'Pagá en 3 cuotas con tarjeta (10% de recargo).', cta: 'Comprar', href: '/productos' };
const PROMO_INSTALLMENT = { text: 'Por tiempo limitado: 3 cuotas sin interés y sin recargo.', cta: 'Comprar', href: '/productos' };

const ROTATE_MS = 5000;

export function BannerTicker() {
  const { active } = useInstallmentsPromo();
  const items = [active ? PROMO_INSTALLMENT : NORMAL_INSTALLMENT, ...BASE_ITEMS];
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [items.length]);

  const item = items[i % items.length];

  return (
    <div className="bg-parchment text-gray-900" role="region" aria-label="Novedades">
      <div className="relative max-w-[1440px] mx-auto px-4 md:px-6 py-3 flex items-center justify-center min-h-[44px]">
        <p key={i} className="t-caption text-center animate-fadeIn">
          {item.text}{' '}
          <Link href={item.href} className="link-apple">
            {item.cta}
          </Link>
        </p>
        <div className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2">
          <DolarWidget />
        </div>
      </div>
    </div>
  );
}
