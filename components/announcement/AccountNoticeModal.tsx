"use client";
import { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { useAccountNotice } from '@/components/announcement/AccountNoticeProvider';
import { ACCOUNT_NOTICE, BACKUP_URL } from '@/lib/accountNotice';

/**
 * Aviso de cuenta. Es lo primero que ve el visitante, así que es bloqueante a
 * propósito: no cierra con Escape ni tocando el fondo, sólo con el botón de
 * entrar. Se prende desde /admin/ajustes y se recuerda por pestaña.
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
    <div className="animate-notice-overlay fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby="account-notice-title"
        aria-describedby="account-notice-message"
        className="notice-card animate-notice-card relative my-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-6 text-center sm:p-8"
      >
        {/* Barrido de luz de entrada — decorativo, no interactivo */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="animate-notice-sheen absolute -inset-y-16 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-300">
            <span className="animate-notice-dot h-1.5 w-1.5 rounded-full bg-amber-400" />
            {ACCOUNT_NOTICE.badge}
          </span>

          <h2 id="account-notice-title" className="t-section mt-4 text-white">
            {ACCOUNT_NOTICE.title}
          </h2>

          <p id="account-notice-message" className="mx-auto mt-3 max-w-[34ch] text-[15px] leading-relaxed text-zinc-300">
            {ACCOUNT_NOTICE.message}
          </p>

          <div className="mt-7 flex flex-col gap-2.5">
            <a
              href={BACKUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-[17px] text-black outline-none transition-transform hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-95"
            >
              {ACCOUNT_NOTICE.follow}
              <ExternalLink aria-hidden className="h-4 w-4" />
            </a>

            <button
              type="button"
              onClick={accept}
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-[15px] text-zinc-400 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {ACCOUNT_NOTICE.accept}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
