"use client";
import { ReactNode, useEffect, useId, useState } from 'react';
import { Sheet, SheetHandleArea } from '@/components/ui/Sheet';
import { rememberedPhone, saveLead, waLink } from '@/lib/contact';
import { validPhone, type LeadInput } from '@/lib/leads';
import { trackEvent } from '@/lib/analytics/track';
import { haptic } from '@/lib/haptics';

/** Campo del número, igual en todos los formularios de contacto */
export function PhoneField({ value, onChange, error, id }: { value: string; onChange: (v: string) => void; error?: string | null; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-semibold text-gray-900">
        Tu WhatsApp
      </label>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="264 480 2994"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-1.5 h-12 w-full rounded-[12px] border bg-white px-4 text-[17px] tabular-nums text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-primary/10 ${
          error ? 'border-red-500' : 'border-gray-200 focus:border-primary'
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Cierre de un formulario de contacto: quedó guardado, o hay que ir por WhatsApp */
export function LeadResult({
  saved,
  phone,
  waText,
  savedTitle,
  onClose,
  source,
}: {
  saved: boolean;
  phone: string;
  /** Mensaje armado para mandar por WhatsApp */
  waText: string;
  savedTitle: string;
  onClose: () => void;
  source: string;
}) {
  return (
    <div className="step-enter px-6 pb-2 pt-6 sm:px-8 sm:pb-8 sm:pt-9">
      <h2 className="pr-10 text-[22px] sm:text-[26px] font-semibold leading-tight tracking-[-0.015em]">
        {saved ? savedTitle : 'No pudimos guardarlo'}
      </h2>
      <p className="mt-2 text-[15px] leading-snug text-gray-600">
        {saved
          ? `Te escribimos por WhatsApp al ${phone}. Si preferís no esperar, mandanos el mensaje ahora.`
          : 'Mandanos el mensaje por WhatsApp y te respondemos por ahí.'}
      </p>
      <div className="mt-6 space-y-2.5">
        <a
          href={waLink(waText)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('whatsapp_click', 'contact', { source })}
          className={saved ? 'btn-apple-ghost w-full' : 'btn-apple w-full'}
        >
          {saved ? 'Escribir ahora por WhatsApp' : 'Abrir WhatsApp'}
        </a>
        <button type="button" onClick={onClose} className={saved ? 'btn-apple w-full' : 'btn-apple-ghost w-full'}>
          Listo
        </button>
      </div>
    </div>
  );
}

/**
 * "Dejanos tu número y te escribimos": la consulta queda guardada en la web
 * aunque WhatsApp no se abra. La usan el talle que no está y el rescate
 * después de tocar el botón de WhatsApp.
 */
export function LeadSheet({
  open,
  onClose,
  title,
  description,
  lead,
  extraLabel,
  extraPlaceholder,
  messageLabel,
  defaultMessage = '',
  submitLabel = 'Que me escriban',
  savedTitle = 'Listo, lo recibimos',
  waText,
  source,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  /** Lo que ya se sabe de la consulta (tipo, producto) */
  lead: Omit<LeadInput, 'phone'>;
  /** Campo corto opcional: se guarda como talle ("¿Qué talle buscás?") */
  extraLabel?: string;
  extraPlaceholder?: string;
  /** Si se pasa, muestra un campo de mensaje libre */
  messageLabel?: string;
  defaultMessage?: string;
  submitLabel?: string;
  savedTitle?: string;
  /** Mensaje para WhatsApp; recibe lo que escribió la persona */
  waText: (v: { extra: string; message: string }) => string;
  /** De dónde salió, para las analíticas */
  source: string;
  /** Algo más debajo del botón (por ejemplo "ya les escribí") */
  footer?: ReactNode;
}) {
  const id = useId();
  const [phone, setPhone] = useState('');
  const [extra, setExtra] = useState('');
  const [message, setMessage] = useState(defaultMessage);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<null | 'saved' | 'failed'>(null);

  useEffect(() => {
    if (!open) return;
    setPhone((p) => p || rememberedPhone());
    setExtra(lead.size || '');
    setMessage(defaultMessage);
    setError(null);
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    if (sending) return;
    if (!validPhone(phone)) {
      setError('Escribí tu número con característica, por ejemplo 264 480 2994');
      return;
    }
    setError(null);
    setSending(true);
    const res = await saveLead({ ...lead, phone, size: extra.trim() || lead.size || null, message: message.trim() || lead.message || null });
    setSending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.ok) {
      haptic();
      trackEvent('lead_saved', 'contact', { kind: lead.kind, source, slug: lead.product_slug ?? null });
    }
    setResult(res.ok ? 'saved' : 'failed');
  };

  return (
    <Sheet open={open} onClose={onClose} labelledBy={`${id}-title`} describedBy={`${id}-desc`}>
      {result ? (
        <LeadResult
          saved={result === 'saved'}
          phone={phone}
          waText={waText({ extra: extra.trim(), message: message.trim() })}
          savedTitle={savedTitle}
          onClose={onClose}
          source={`${source}_after_lead`}
        />
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <SheetHandleArea className="px-6 pt-4 sm:px-8 sm:pt-8">
            <h2 id={`${id}-title`} className="pr-10 text-[22px] sm:text-[26px] font-semibold leading-tight tracking-[-0.015em]">
              {title}
            </h2>
            <p id={`${id}-desc`} className="mt-1.5 text-[15px] leading-snug text-gray-600">
              {description}
            </p>
          </SheetHandleArea>

          <div className="space-y-4 px-6 pt-5 sm:px-8">
            {extraLabel && (
              <div>
                <label htmlFor={`${id}-extra`} className="block text-[13px] font-semibold text-gray-900">
                  {extraLabel}
                </label>
                <input
                  id={`${id}-extra`}
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder={extraPlaceholder}
                  maxLength={40}
                  className="mt-1.5 h-12 w-full rounded-[12px] border border-gray-200 bg-white px-4 text-[17px] text-gray-900 placeholder:text-gray-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>
            )}
            <PhoneField id={`${id}-phone`} value={phone} onChange={setPhone} error={error} />
            {messageLabel && (
              <div>
                <label htmlFor={`${id}-msg`} className="block text-[13px] font-semibold text-gray-900">
                  {messageLabel}
                </label>
                <textarea
                  id={`${id}-msg`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  className="mt-1.5 w-full resize-none rounded-[12px] border border-gray-200 bg-white px-4 py-3 text-[17px] leading-snug text-gray-900 placeholder:text-gray-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>
            )}
          </div>

          <div className="space-y-2.5 px-6 pb-2 pt-6 sm:px-8 sm:pb-7">
            <button type="submit" disabled={sending} className="btn-apple w-full disabled:opacity-60">
              {sending ? 'Guardando' : submitLabel}
            </button>
            {footer}
          </div>
        </form>
      )}
    </Sheet>
  );
}
