"use client";
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import logo from '@/public/logo-white.png';
import { Sheet } from '@/components/ui/Sheet';
import { useAccountNotice } from '@/components/announcement/AccountNoticeProvider';
import { ACCOUNT_NOTICE, INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/accountNotice';

/**
 * Aviso de cuenta. Es lo primero que ve el visitante, así que es bloqueante a
 * propósito: no cierra con Escape, ni tocando el fondo, ni deslizando; sólo
 * con "Entrar a la web". Se prende desde /admin/ajustes y se recuerda por
 * pestaña.
 *
 * La cuenta se muestra como un perfil de Instagram (foto, usuario
 * y para qué es): se reconoce de un vistazo qué hay que seguir.
 */
export function AccountNoticeModal() {
  const { open, accept } = useAccountNotice();

  return (
    <Sheet open={open} labelledBy="account-notice-title" describedBy="account-notice-message">
      <div className="px-6 pt-7 sm:px-8 sm:pt-9">
        <h2 id="account-notice-title" className="text-[24px] sm:text-[28px] font-semibold leading-tight tracking-[-0.015em] text-center">
          {ACCOUNT_NOTICE.title}
        </h2>
        <p id="account-notice-message" className="mx-auto mt-2.5 max-w-[34ch] text-center text-[15px] leading-relaxed text-gray-600">
          {ACCOUNT_NOTICE.message}
        </p>

        {/* La cuenta, como se ve en Instagram */}
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center gap-3.5 rounded-[16px] bg-[#f5f5f7] p-3.5 transition-colors hover:bg-[#ececf0] active:scale-[0.99]"
        >
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black">
            <Image src={logo} alt="" className="h-auto w-10" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-semibold">{INSTAGRAM_HANDLE.replace(/^@/, '')}</span>
            <span className="block text-[13px] text-gray-500">{ACCOUNT_NOTICE.badge}</span>
          </span>
          <span className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-white">
            Seguir
          </span>
        </a>
      </div>

      <div className="flex flex-col gap-1 px-6 pb-2 pt-5 sm:px-8 sm:pb-7">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-apple w-full"
        >
          {ACCOUNT_NOTICE.follow}
          <ExternalLink aria-hidden className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={accept}
          className="min-h-[44px] w-full rounded-full text-[17px] text-primary transition-colors hover:bg-gray-50 active:scale-[0.98]"
        >
          {ACCOUNT_NOTICE.accept}
        </button>
      </div>
    </Sheet>
  );
}
