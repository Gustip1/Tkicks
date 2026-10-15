"use client";
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics/track';
import { Sheet, SheetHandleArea } from '@/components/ui/Sheet';

const WA_NUMBER = '5492644802994';

type Currency = 'ARS' | 'USD';

/**
 * "Hacer una oferta" — el cliente propone un precio (en pesos o dólares, a su
 * elección) y se abre WhatsApp con el mensaje armado para negociar. No crea
 * ninguna orden ni pasa por el backend, mismo criterio que el flujo de
 * 3 cuotas del checkout.
 */
export function MakeOffer({ productTitle, productSlug }: { productTitle: string; productSlug: string }) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [amount, setAmount] = useState('');

  const handleSubmit = () => {
    const value = amount.trim();
    if (!value) return;

    trackEvent('offer_requested', 'ecommerce', { slug: productSlug, amount: value, currency });

    const productUrl = typeof window !== 'undefined' ? window.location.href : '';
    const currencyLabel = currency === 'USD' ? 'dólares (USD)' : 'pesos (ARS)';
    const message =
      `¡Hola! Quiero hacer una oferta por este producto:\n\n` +
      `👟 *${productTitle}*\n${productUrl}\n\n` +
      `💰 *Mi oferta:* ${currency === 'USD' ? 'US$' : '$'}${value} — en *${currencyLabel}*\n\n` +
      `¿Podemos negociar?`;

    window.open(`https://api.whatsapp.com/send?phone=${WA_NUMBER}&text=${encodeURIComponent(message)}`, '_blank');
    setOpen(false);
    setAmount('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-apple-ghost w-full"
      >
        Hacer una oferta
      </button>

      {/* La oferta en su propia hoja: el teclado numérico aparece solo y el
          resto de la ficha no salta mientras se escribe */}
      <Sheet open={open} onClose={() => setOpen(false)} labelledBy="offer-title" describedBy="offer-help">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <SheetHandleArea className="px-6 pt-4 sm:px-8 sm:pt-8">
            <h2 id="offer-title" className="pr-10 text-[22px] sm:text-[26px] font-semibold leading-tight tracking-[-0.015em]">
              ¿Cuánto ofrecés?
            </h2>
            <p id="offer-help" className="mt-1.5 truncate text-[15px] text-gray-500">{productTitle}</p>
          </SheetHandleArea>

          <div className="px-6 pt-5 sm:px-8">
            {/* Moneda: control segmentado, como en iOS */}
            <div role="radiogroup" aria-label="Moneda" className="grid grid-cols-2 gap-1 rounded-[12px] bg-[#f0f0f2] p-1">
              {(['ARS', 'USD'] as Currency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={currency === c}
                  onClick={() => setCurrency(c)}
                  className={cn(
                    'min-h-[40px] rounded-[9px] text-[15px] transition-[background-color,box-shadow,color] duration-200',
                    currency === c ? 'bg-white font-semibold text-gray-900 shadow-[0_1px_4px_rgba(0,0,0,0.12)]' : 'text-gray-600'
                  )}
                >
                  {c === 'ARS' ? 'Pesos' : 'Dólares'}
                </button>
              ))}
            </div>

            <label className="mt-4 flex items-center gap-2 rounded-[14px] border border-gray-200 px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <span className="text-[24px] font-semibold text-gray-400">{currency === 'USD' ? 'US$' : '$'}</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={currency === 'ARS' ? '800000' : '500'}
                autoFocus
                aria-label={`Monto en ${currency === 'ARS' ? 'pesos' : 'dólares'}`}
                className="h-16 w-full bg-transparent text-[28px] font-semibold tabular-nums text-gray-900 placeholder:text-gray-300 focus:outline-none"
              />
            </label>
            <p className="mt-2.5 text-[13px] text-gray-500">Se abre WhatsApp con tu oferta lista para mandar.</p>
          </div>

          <div className="px-6 pb-2 pt-6 sm:px-8 sm:pb-7">
            <button type="submit" disabled={!amount.trim()} className="btn-apple w-full disabled:opacity-40">
              Enviar oferta por WhatsApp
            </button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
