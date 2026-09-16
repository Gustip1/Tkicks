"use client";
import { useEffect, useRef } from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { useAccountNotice } from '@/components/announcement/AccountNoticeProvider';
import { ACCOUNT_NOTICE, TIKTOK_HANDLE, TIKTOK_URL } from '@/lib/accountNotice';

const STAMP_DELAY = ['notice-stamp-delay-1', 'notice-stamp-delay-2', 'notice-stamp-delay-3'];

/**
 * Aviso de cuenta suspendida. Es lo primero que ve el visitante, así que es
 * bloqueante a propósito: no cierra con Escape ni tocando el fondo, sólo con
 * "Entendido". Se prende desde /admin/ajustes y se recuerda por pestaña.
 */
export function AccountNoticeModal() {
  const { open, accept } = useAccountNotice();
  const cardRef = useRef<HTMLDivElement>(null);

  // Mientras tapa la pantalla, el fondo no scrollea.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  // El foco arranca y se queda dentro del diálogo: con el fondo inerte, un Tab
  // que se escapa deja al teclado navegando una página que no puede ver. Se
  // enfoca la tarjeta y no el botón, así el lector de pantalla lee el aviso
  // completo y no aparece un anillo de foco encima del CTA al abrir.
  useEffect(() => {
    if (!open) return;

    cardRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !cardRef.current) return;

      const focusables = cardRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey && (activeEl === first || !cardRef.current.contains(activeEl))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="animate-notice-overlay fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md"
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby="account-notice-title"
        aria-describedby="account-notice-lead"
        className="notice-card animate-notice-card relative my-auto flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-5 shadow-2xl shadow-black/60 sm:p-8"
      >
        {/* Barrido de luz de entrada — decorativo, no interactivo */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="animate-notice-sheen absolute -inset-y-16 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative min-h-0 overflow-y-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-amber-300">
            <span className="animate-notice-dot h-1.5 w-1.5 rounded-full bg-amber-400" />
            {ACCOUNT_NOTICE.badge}
          </span>

          <h2
            id="account-notice-title"
            className="mt-3 text-xl font-black leading-tight text-white sm:mt-4 sm:text-3xl"
          >
            {ACCOUNT_NOTICE.title}
          </h2>

          <p id="account-notice-lead" className="mt-2.5 text-[13px] leading-relaxed text-zinc-300 sm:mt-3 sm:text-base">
            {ACCOUNT_NOTICE.lead}
          </p>

          <p className="mt-2.5 border-l-2 border-amber-400/40 pl-3 text-[13px] italic leading-relaxed text-zinc-400 sm:mt-3 sm:text-sm">
            {ACCOUNT_NOTICE.aside}
          </p>

          <div className="mt-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 sm:mt-4 sm:p-4">
            <p className="flex gap-3 text-[13px] leading-relaxed text-zinc-300 sm:text-sm">
              <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <span>{ACCOUNT_NOTICE.body}</span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
              {ACCOUNT_NOTICE.stamps.map((stamp, i) => (
                <span
                  key={stamp}
                  className={`animate-notice-stamp ${STAMP_DELAY[i] ?? ''} rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-200`}
                >
                  {stamp}
                </span>
              ))}
            </div>

            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {ACCOUNT_NOTICE.stampsCaption}
            </p>
          </div>

          <p className="mt-3.5 text-[13px] leading-relaxed text-zinc-300 sm:mt-4 sm:text-sm">
            {ACCOUNT_NOTICE.reassurance}
          </p>

        </div>

        {/* Pie fijo: en pantallas bajas el cuerpo scrollea, pero el botón para
            aceptar tiene que estar siempre a la vista. */}
        <div className="relative shrink-0 pt-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-[13px] font-black text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 sm:flex-1 sm:py-3 sm:text-sm"
            >
              <span className="truncate">{ACCOUNT_NOTICE.tiktokLead} {TIKTOK_HANDLE}</span>
              <ExternalLink aria-hidden className="h-4 w-4" />
            </a>

            <button
              type="button"
              onClick={accept}
              className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-white px-6 py-3 text-sm font-black uppercase tracking-wider text-black outline-none transition-transform hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-95"
            >
              {ACCOUNT_NOTICE.accept}
            </button>
          </div>

          <p className="mt-4 text-center text-xs font-bold text-zinc-500 sm:mt-5">
            {ACCOUNT_NOTICE.signature}
          </p>
        </div>
      </div>
    </div>
  );
}
