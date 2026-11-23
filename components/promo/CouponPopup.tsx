"use client";
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Copy } from 'lucide-react';
import { Sheet, SheetHandleArea } from '@/components/ui/Sheet';
import { PhoneField } from '@/components/contact/LeadSheet';
import { rememberedPhone } from '@/lib/contact';
import { validPhone } from '@/lib/leads';
import { trackEvent } from '@/lib/analytics/track';
import { haptic } from '@/lib/haptics';
import type { CouponPopupPublic } from '@/lib/couponPopup';

/**
 * Popup de cupón: el visitante deja su WhatsApp y recibe un cupón. Se prende
 * y se configura en /admin/cupones.
 *
 * Aparece una sola vez, después de un rato en la web y nunca encima de otro
 * popup, del menú o del carrito. Quien lo cierra no lo vuelve a ver por dos
 * semanas; quien deja su número, nunca más.
 *
 * El código no viaja al navegador hasta que dejan el número: si WhatsApp está
 * conectado llega por ahí; si no, se muestra acá mismo.
 */

const SEEN_KEY = 'tk-cupon-popup';
/** El cupón que recibió en pantalla: el checkout lo deja escrito */
export const SAVED_COUPON_KEY = 'tk-cupon';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

/** Páginas donde no se interrumpe: está comprando, entrando o leyendo algo puntual */
const QUIET = ['/admin', '/checkout', '/login', '/register', '/account', '/orders', '/track', '/terminos', '/privacidad', '/sorteo'];

type Result = { delivery: 'whatsapp' } | { delivery: 'screen'; code: string; headline: string; conditions: string[] };

function alreadyHandled(): boolean {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return false;
    const seen = JSON.parse(raw) as { done?: boolean; dismissedAt?: number };
    return seen.done === true || (typeof seen.dismissedAt === 'number' && Date.now() - seen.dismissedAt < SNOOZE_MS);
  } catch {
    return false;
  }
}

function remember(value: { done?: boolean; dismissedAt?: number }) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: a lo sumo vuelve a aparecer en otra visita */
  }
}

export function CouponPopup() {
  const pathname = usePathname();
  const id = useId();
  const [content, setContent] = useState<CouponPopupPublic | null>(null);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const quiet = QUIET.some((p) => pathname.startsWith(p));
  const quietRef = useRef(quiet);
  quietRef.current = quiet;
  const shown = useRef(false);

  // Se pregunta una sola vez si hay popup, y solo a quien todavía no lo vio
  useEffect(() => {
    if (alreadyHandled()) return;
    let cancelled = false;
    fetch('/api/subscribers')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CouponPopupPublic | null) => {
        if (!cancelled && data?.enabled) setContent(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!content || shown.current) return;
    let timer: ReturnType<typeof setTimeout>;
    const tryOpen = () => {
      // Espera si no está mirando, si está en una página tranquila o si hay otra
      // cosa abierta (los popups, el menú y el carrito bloquean el scroll del body)
      const busy = document.visibilityState !== 'visible' || quietRef.current || document.body.style.overflow === 'hidden';
      if (busy) {
        timer = setTimeout(tryOpen, 4000);
        return;
      }
      shown.current = true;
      setPhone(rememberedPhone());
      setOpen(true);
      trackEvent('coupon_popup_shown', 'promo', {});
    };
    timer = setTimeout(tryOpen, content.delaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [content]);

  const dismiss = () => {
    setOpen(false);
    if (!result) {
      remember({ dismissedAt: Date.now() });
      trackEvent('coupon_popup_dismissed', 'promo', {});
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (!validPhone(phone)) {
      setError('Escribí tu número con característica, por ejemplo 264 480 2994');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'No pudimos guardar tu número. Probá de nuevo.');
        return;
      }
      remember({ done: true });
      haptic();
      trackEvent('coupon_popup_submitted', 'promo', { delivery: data.delivery });
      if (data.delivery === 'screen') {
        try {
          localStorage.setItem(SAVED_COUPON_KEY, data.code);
        } catch {
          /* igual lo ve en pantalla */
        }
        setResult({ delivery: 'screen', code: data.code, headline: data.headline, conditions: data.conditions ?? [] });
      } else {
        setResult({ delivery: 'whatsapp' });
      }
    } catch {
      setError('Sin conexión. Probá de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      haptic();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* el código está a la vista: se puede copiar a mano */
    }
  };

  if (!content) return null;

  return (
    <Sheet open={open} onClose={dismiss} labelledBy={`${id}-title`} describedBy={`${id}-text`}>
      {result ? (
        <div className="step-enter px-6 pb-2 pt-6 sm:px-8 sm:pb-8 sm:pt-9">
          {result.delivery === 'whatsapp' ? (
            <>
              <h2 id={`${id}-title`} className="pr-10 text-[22px] sm:text-[26px] font-semibold leading-tight tracking-[-0.015em]">
                Listo, ya te lo mandamos
              </h2>
              <p id={`${id}-text`} className="mt-2 text-[15px] leading-snug text-gray-600">
                Te escribimos por WhatsApp al {phone} con tu cupón. Lo cargás en el checkout, antes de pagar.
              </p>
            </>
          ) : (
            <>
              <h2 id={`${id}-title`} className="pr-10 text-[22px] sm:text-[26px] font-semibold leading-tight tracking-[-0.015em]">
                Este es tu cupón
              </h2>
              <p id={`${id}-text`} className="mt-2 text-[15px] leading-snug text-gray-600">
                {result.headline}. Lo cargás en el checkout, antes de pagar.
              </p>
              <button
                type="button"
                onClick={() => copy(result.code)}
                className="mt-5 flex min-h-[64px] w-full items-center justify-between gap-3 rounded-[16px] bg-[#f5f5f7] px-5 text-left transition-transform duration-150 active:scale-[0.98]"
              >
                <span className="min-w-0 truncate font-mono text-[24px] font-semibold tracking-[0.04em] text-[#1d1d1f]">{result.code}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-[15px] text-primary" aria-live="polite">
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  {copied ? 'Copiado' : 'Copiar'}
                </span>
              </button>
              {result.conditions.length > 0 && <p className="mt-3 text-[13px] leading-snug text-gray-500">{result.conditions.join(' · ')}</p>}
            </>
          )}
          <div className="mt-6">
            <Link href="/productos" onClick={() => setOpen(false)} className="btn-apple w-full">
              Ver productos
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <SheetHandleArea className="px-6 pt-5 sm:px-8 sm:pt-9">
            <h2 id={`${id}-title`} className="pr-10 text-[24px] sm:text-[28px] font-semibold leading-tight tracking-[-0.015em]">
              {content.title}
            </h2>
            <p id={`${id}-text`} className="mt-2 text-[15px] leading-snug text-gray-600">
              {content.text}
            </p>
            {content.conditions.length > 0 && <p className="mt-2 text-[13px] leading-snug text-gray-500">{content.conditions.join(' · ')}</p>}
          </SheetHandleArea>

          <div className="px-6 pb-2 pt-5 sm:px-8 sm:pb-8">
            <PhoneField id={`${id}-phone`} value={phone} onChange={setPhone} error={error} />
            <div className="mt-5 flex flex-col gap-1">
              <button type="submit" disabled={sending} className="btn-apple w-full disabled:opacity-60">
                {sending ? 'Enviando…' : 'Quiero mi cupón'}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="min-h-[44px] w-full rounded-full text-[17px] text-primary transition-colors hover:bg-gray-50 active:scale-[0.98]"
              >
                Ahora no
              </button>
            </div>
            <p className="mt-3 text-center text-[12px] leading-snug text-gray-500">
              Te escribimos por WhatsApp con el cupón y las novedades de Tkicks. Podés pedir la baja cuando quieras.{' '}
              <Link href="/privacidad" onClick={() => setOpen(false)} className="underline">
                Privacidad
              </Link>
            </p>
          </div>
        </form>
      )}
    </Sheet>
  );
}
