"use client";
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Copy } from 'lucide-react';
import { Sheet, SheetHandleArea } from '@/components/ui/Sheet';
import { rememberedPhone } from '@/lib/contact';
import { validPhone } from '@/lib/leads';
import { trackEvent } from '@/lib/analytics/track';
import { haptic } from '@/lib/haptics';
import { validEmail, type CouponPopupPublic } from '@/lib/couponPopup';

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

type Result = { delivery: 'whatsapp' } | { delivery: 'later' } | { delivery: 'screen'; code: string; headline: string; conditions: string[] };

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
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
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
    // Modo lista: además del WhatsApp se pide el email
    const list = content?.mode === 'list';
    const badEmail = list && !validEmail(email);
    const badPhone = !validPhone(phone);
    setEmailError(badEmail ? 'Escribí tu email, por ejemplo nombre@gmail.com' : null);
    setError(badPhone ? 'Escribí tu número con característica, por ejemplo 264 480 2994' : null);
    if (badEmail || badPhone) return;
    setSending(true);
    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list ? { phone, email: email.trim() } : { phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        const message = data?.error || 'No pudimos guardar tu número. Probá de nuevo.';
        if (data?.field === 'email') setEmailError(message);
        else setError(message);
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
        setResult({ delivery: data.delivery === 'later' ? 'later' : 'whatsapp' });
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

  const list = content.mode === 'list';

  return (
    <Sheet open={open} onClose={dismiss} labelledBy={`${id}-title`} describedBy={`${id}-text`} tone="dark">
      {result ? (
        <div className="step-enter px-6 pb-3 pt-6 sm:px-9 sm:pb-9 sm:pt-11">
          {result.delivery === 'screen' ? (
            <>
              <h2 id={`${id}-title`} className="pr-10 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-white">
                Este es tu cupón
              </h2>
              <p id={`${id}-text`} className="mt-2.5 text-[15px] leading-snug text-white/70">
                {result.headline}. Lo cargás en el checkout, antes de pagar.
              </p>
              <button
                type="button"
                onClick={() => copy(result.code)}
                className="mt-5 flex min-h-[68px] w-full items-center justify-between gap-3 rounded-[18px] bg-white/10 px-5 text-left transition-transform duration-150 active:scale-[0.98]"
              >
                <span className="min-w-0 truncate font-mono text-[24px] font-semibold tracking-[0.04em] text-white">{result.code}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-[15px] text-white/80" aria-live="polite">
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  {copied ? 'Copiado' : 'Copiar'}
                </span>
              </button>
              {result.conditions.length > 0 && <p className="mt-3 text-[13px] leading-snug text-white/50">{result.conditions.join(' · ')}</p>}
            </>
          ) : (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black">
                <Check className="h-7 w-7" strokeWidth={2.5} aria-hidden />
              </span>
              <h2 id={`${id}-title`} className="mt-5 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-white">
                {result.delivery === 'later' ? 'Listo, ya estás en la lista' : 'Listo, ya te lo mandamos'}
              </h2>
              <p id={`${id}-text`} className="mt-2.5 text-[15px] leading-snug text-white/70">
                {result.delivery === 'later'
                  ? `Te mandamos tu descuento por WhatsApp al ${phone} o por email. Lo cargás en el checkout, antes de pagar.`
                  : `Te escribimos por WhatsApp al ${phone} con tu cupón. Lo cargás en el checkout, antes de pagar.`}
              </p>
            </>
          )}
          <div className="mt-7">
            <Link href="/productos" onClick={() => setOpen(false)} className="promo-cta">
              Ver productos
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <SheetHandleArea className="px-6 pt-4 sm:px-9 sm:pt-11">
            <h2 id={`${id}-title`} className="text-[26px] min-[380px]:text-[30px] sm:pr-8 sm:text-[34px] font-semibold leading-[1.05] tracking-[-0.025em] text-white">
              {content.title}
            </h2>

            {/* Los descuentos, en grande: es lo que hace que alguien deje sus datos */}
            {content.highlights.length > 0 && (
              <ul className={`mt-5 grid gap-2 ${content.highlights.length === 1 ? 'grid-cols-1' : content.highlights.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`} aria-label="Descuentos">
                {content.highlights.map((h, i) => {
                  const m = /^(US\$|\$)?\s*([\d.,]+)\s*(%)?$/.exec(h);
                  const single = content.highlights.length === 1;
                  return (
                    <li
                      key={h}
                      style={{ ['--i' as string]: i }}
                      className={`promo-tile flex flex-col items-center justify-center rounded-[20px] bg-white/[0.08] text-center ${single ? 'py-4 min-[380px]:py-6' : 'py-4'}`}
                    >
                      <span className="sr-only">{h} de descuento</span>
                      <span aria-hidden className="flex items-start justify-center font-semibold leading-none tracking-[-0.04em] text-white tabular-nums">
                        {m?.[1] && <span className={`mr-0.5 font-semibold tracking-normal text-white/60 ${single ? 'mt-2 text-[20px]' : 'mt-1 text-[13px]'}`}>{m[1]}</span>}
                        <span className={single ? 'text-[60px] min-[380px]:text-[80px]' : 'text-[46px]'}>{m ? m[2] : h}</span>
                        {m?.[3] && <span className={single ? 'mt-2 text-[34px]' : 'mt-1 text-[22px]'}>%</span>}
                      </span>
                      <span aria-hidden className="mt-1.5 text-[12px] text-white/55">
                        de descuento
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <p id={`${id}-text`} className="mt-4 text-[16px] leading-snug text-white/75">
              {content.text}
            </p>
            {content.conditions.length > 0 && <p className="mt-1.5 text-[13px] leading-snug text-white/50">{content.conditions.join(' · ')}</p>}
          </SheetHandleArea>

          <div className="px-6 pb-2 pt-4 sm:px-9 sm:pb-9">
            <div className="space-y-2.5">
              {list && (
                <div>
                  <label htmlFor={`${id}-email`} className="sr-only">
                    Tu email
                  </label>
                  <input
                    id={`${id}-email`}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Tu email"
                    aria-invalid={Boolean(emailError)}
                    aria-describedby={emailError ? `${id}-email-error` : undefined}
                    className="promo-field"
                  />
                  {emailError && (
                    <p id={`${id}-email-error`} className="mt-1.5 text-[13px] text-[#ff6961]">
                      {emailError}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label htmlFor={`${id}-phone`} className="sr-only">
                  Tu WhatsApp
                </label>
                <input
                  id={`${id}-phone`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Tu WhatsApp, con característica"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-phone-error` : undefined}
                  className="promo-field tabular-nums"
                />
                {error && (
                  <p id={`${id}-phone-error`} className="mt-1.5 text-[13px] text-[#ff6961]">
                    {error}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1">
              <button type="submit" disabled={sending} className="promo-cta">
                {sending ? 'Enviando…' : list ? 'Quiero mi descuento' : 'Quiero mi cupón'}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="min-h-[44px] w-full rounded-full text-[16px] text-white/70 transition-colors hover:text-white active:scale-[0.98]"
              >
                Ahora no
              </button>
            </div>
            <p className="mt-1 text-center text-[12px] leading-snug text-white/45">
              {list ? 'Te escribimos por WhatsApp o email con tu descuento y novedades.' : 'Te escribimos por WhatsApp con el cupón y novedades.'} Podés pedir la baja
              cuando quieras.{' '}
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
