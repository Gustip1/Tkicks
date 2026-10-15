"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { useInstallmentsPromo } from '@/components/InstallmentsPromoProvider';
import { useAccountNotice } from '@/components/announcement/AccountNoticeProvider';

/**
 * Promo de 3 cuotas sin interés. Aparece al entrar mientras la promo esté
 * prendida en /admin/ajustes; si el aviso de cuenta está en pantalla espera su
 * turno (encimados no se lee ninguno).
 *
 * El dato que importa va grande: "0%" de interés, y debajo cómo se paga.
 * Sin emojis ni brillos: el rojo alcanza para que se lea como promo.
 */
export function PromoModal() {
  const { active } = useInstallmentsPromo();
  const { open: noticeOpen } = useAccountNotice();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (active && !noticeOpen) setOpen(true);
  }, [active, noticeOpen]);

  const dismiss = () => setOpen(false);

  return (
    <Sheet open={open} onClose={dismiss} labelledBy="promo-title" describedBy="promo-text">
      <div className="px-6 pt-5 sm:px-8 sm:pt-10 text-center">
        <p aria-hidden className="text-[72px] sm:text-[88px] font-semibold leading-none tracking-[-0.04em] text-red-600 tabular-nums">
          0%
        </p>
        <h2 id="promo-title" className="mt-3 text-[24px] sm:text-[28px] font-semibold leading-tight tracking-[-0.015em]">
          3 cuotas sin interés
        </h2>
        <p id="promo-text" className="mx-auto mt-2.5 max-w-[32ch] text-[15px] leading-relaxed text-gray-600">
          Pagás con tarjeta en 3 cuotas, al mismo precio que en efectivo o transferencia.
        </p>

        {/* Cómo se ve en la práctica: mismo precio, dividido en 3 */}
        <div className="mt-6 flex items-center justify-center gap-2" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span key={n} className="flex h-11 flex-1 max-w-[96px] items-center justify-center gap-1.5 rounded-[12px] bg-red-50 text-[13px] font-semibold text-red-600">
              <CreditCard className="h-3.5 w-3.5" />
              Cuota {n}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1 px-6 pb-2 pt-6 sm:px-8 sm:pb-7">
        <Link href="/productos" onClick={dismiss} className="btn-apple w-full">
          Ver productos
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-[44px] w-full rounded-full text-[17px] text-primary transition-colors hover:bg-gray-50 active:scale-[0.98]"
        >
          Ahora no
        </button>
      </div>
    </Sheet>
  );
}
