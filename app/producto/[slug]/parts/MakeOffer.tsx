"use client";
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics/track';

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
    <div className="rounded-lg bg-gray-100 p-5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full border border-primary bg-white text-primary font-normal text-[17px] hover:bg-primary hover:text-white active:scale-95 transition-[transform,background-color,color] duration-200"
        >
          Hacer una oferta
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-[17px] font-semibold text-gray-900">¿Cuánto ofrecés?</p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrency('ARS')}
              className={cn(
                'flex-1 py-2.5 rounded-full text-sm transition-colors',
                currency === 'ARS' ? 'bg-white text-gray-900 font-semibold ring-2 ring-primary-hover' : 'bg-white/60 text-gray-600 font-normal ring-1 ring-gray-200',
              )}
            >
              Pesos (ARS)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={cn(
                'flex-1 py-2.5 rounded-full text-sm transition-colors',
                currency === 'USD' ? 'bg-white text-gray-900 font-semibold ring-2 ring-primary-hover' : 'bg-white/60 text-gray-600 font-normal ring-1 ring-gray-200',
              )}
            >
              Dólares (USD)
            </button>
          </div>

          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={currency === 'ARS' ? 'Ej: 800000' : 'Ej: 500'}
            autoFocus
            className="w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-[17px] font-normal text-gray-900 focus:outline-none focus:border-primary transition-colors"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-3 rounded-full text-primary font-normal text-[17px] hover:bg-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!amount.trim()}
              className="flex-1 py-3 rounded-full bg-primary text-white font-normal text-[17px] hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Enviar oferta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
