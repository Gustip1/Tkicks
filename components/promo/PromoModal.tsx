"use client";
import { useEffect, useState } from 'react';
import { useInstallmentsPromo } from '@/components/InstallmentsPromoProvider';
import { PROMO_TEXT } from '@/lib/promo';

export function PromoModal() {
  const { active } = useInstallmentsPromo();
  const [open, setOpen] = useState(false);

  // Aparece SIEMPRE que entran al sitio (refresh / pestaña nueva /
  // visita nueva) mientras la promo esté activa desde /admin/ajustes.
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  const dismiss = () => setOpen(false);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="relative max-w-md w-full bg-gradient-to-br from-zinc-900 via-black to-zinc-900 border-2 border-orange-500 rounded-2xl shadow-2xl shadow-orange-500/20 p-6 sm:p-8 text-center">
        <div className="flex justify-center mb-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest">
            🔥 Promo por tiempo limitado
          </span>
        </div>

        <h2
          id="promo-title"
          className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3"
        >
          3 cuotas sin interés
        </h2>

        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-6">
          {PROMO_TEXT}
        </p>

        <button
          type="button"
          onClick={dismiss}
          className="w-full sm:w-auto sm:min-w-[180px] px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-black uppercase tracking-wider text-sm transition-colors active:scale-95"
          autoFocus
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
