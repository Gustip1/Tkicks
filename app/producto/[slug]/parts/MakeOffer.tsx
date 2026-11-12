"use client";
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics/track';
import { Sheet, SheetHandleArea } from '@/components/ui/Sheet';
import { LeadResult, PhoneField } from '@/components/contact/LeadSheet';
import { rememberedPhone, saveLead } from '@/lib/contact';
import { validPhone } from '@/lib/leads';
import { haptic } from '@/lib/haptics';

type Currency = 'ARS' | 'USD';

/**
 * "Hacer una oferta": el cliente propone un precio (en pesos o dólares) y deja
 * su WhatsApp. La oferta queda guardada en /admin/consultas, así llega aunque
 * WhatsApp no se abra; antes dependía de que apretara Enviar en el chat y la
 * mayoría se perdía. No crea ninguna orden ni reserva stock.
 */
export function MakeOffer({ productTitle, productSlug }: { productTitle: string; productSlug: string }) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<null | 'saved' | 'failed'>(null);

  const openSheet = () => {
    setPhone((p) => p || rememberedPhone());
    setPhoneError(null);
    setResult(null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    if (result) setAmount('');
  };

  const waMessage = () => {
    const productUrl = typeof window !== 'undefined' ? window.location.href : '';
    return (
      `Hola! Quiero hacer una oferta por *${productTitle}*\n${productUrl}\n\n` +
      `Mi oferta: ${currency === 'USD' ? 'US$' : '$'}${amount.trim()} en ${currency === 'USD' ? 'dólares' : 'pesos'}`
    );
  };

  const handleSubmit = async () => {
    const value = amount.trim();
    if (!value || sending) return;
    if (!validPhone(phone)) {
      setPhoneError('Escribí tu número con característica, por ejemplo 264 480 2994');
      return;
    }
    setPhoneError(null);
    setSending(true);
    trackEvent('offer_requested', 'ecommerce', { slug: productSlug, amount: value, currency });
    const res = await saveLead({ kind: 'offer', phone, amount: value, currency, product_slug: productSlug, product_title: productTitle });
    setSending(false);
    if (res.error) {
      setPhoneError(res.error);
      return;
    }
    if (res.ok) {
      haptic();
      trackEvent('lead_saved', 'contact', { kind: 'offer', source: 'offer', slug: productSlug });
    }
    setResult(res.ok ? 'saved' : 'failed');
  };

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className="btn-apple-ghost w-full"
      >
        Hacer una oferta
      </button>

      {/* La oferta en su propia hoja: el teclado numérico aparece solo y el
          resto de la ficha no salta mientras se escribe */}
      <Sheet open={open} onClose={close} labelledBy="offer-title" describedBy="offer-help">
        {result ? (
          <LeadResult
            saved={result === 'saved'}
            phone={phone}
            waText={waMessage()}
            savedTitle="Recibimos tu oferta"
            onClose={close}
            source="offer_after_lead"
          />
        ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
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
            <div className="mt-4">
              <PhoneField id="offer-phone" value={phone} onChange={setPhone} error={phoneError} />
            </div>
            <p className="mt-2.5 text-[13px] text-gray-500">Te respondemos por WhatsApp a ese número.</p>
          </div>

          <div className="px-6 pb-2 pt-6 sm:px-8 sm:pb-7">
            <button type="submit" disabled={!amount.trim() || sending} className="btn-apple w-full disabled:opacity-40">
              {sending ? 'Enviando' : 'Enviar oferta'}
            </button>
          </div>
        </form>
        )}
      </Sheet>
    </>
  );
}
