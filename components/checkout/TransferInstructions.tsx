"use client";
import { useState } from 'react';
import { Check, Copy, Upload } from 'lucide-react';
import { formatARS } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics/track';
import { haptic } from '@/lib/haptics';
import { PROOF_ACCEPT, uploadProof } from '@/lib/images/prepareProof';

export interface TransferAccount {
  aliasArs: string;
  aliasUsd: string;
  holder: string;
  cryptoWallet: string;
  whatsappNumber: string;
}

/** Un dato para copiar con un toque (alias, monto, billetera) */
function CopyRow({ label, value, copyValue, mono = false }: { label: string; value: string; copyValue?: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
    } catch {
      // Navegadores que no dejan copiar (algunos internos de apps): se puede seleccionar a mano
      return;
    }
    haptic();
    setCopied(true);
    trackEvent('transfer_data_copied', 'ecommerce', { field: label });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center justify-between gap-3 py-3.5">
      <div className="min-w-0">
        <p className="text-[13px] text-gray-500">{label}</p>
        <p className={`select-all break-all text-[17px] font-semibold text-gray-900 ${mono ? 'font-mono text-[15px]' : ''}`}>{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copiar ${label.toLowerCase()}`}
        className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3.5 text-[14px] text-primary transition-transform duration-150 active:scale-[0.97]"
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        <span aria-live="polite">{copied ? 'Copiado' : 'Copiar'}</span>
      </button>
    </div>
  );
}

/**
 * Datos para transferir, después de confirmar el pedido.
 *
 * Antes el alias se mostraba antes de crear el pedido: la persona salía a la
 * app del banco y, al volver, el pedido nunca había quedado registrado (14 de
 * 21 checkouts terminaron así). Ahora el pedido ya existe cuando ve el alias,
 * con sus datos de contacto, y acá solo le queda pagar y avisar.
 */
export function TransferInstructions({
  account,
  orderId,
  orderRef,
  totalUsd,
  totalArs,
}: {
  account: TransferAccount;
  orderId: string;
  orderRef: string;
  totalUsd: number;
  totalArs: number;
}) {
  const [proof, setProof] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [proofError, setProofError] = useState('');

  const upload = async (file: File) => {
    setProof('uploading');
    const result = await uploadProof(orderId, file);
    if (result.ok) {
      setProof('done');
      trackEvent('transfer_proof_uploaded', 'ecommerce', { order: orderRef });
    } else {
      setProofError(result.error);
      setProof('error');
      trackEvent('transfer_proof_error', 'ecommerce', { order: orderRef, reason: result.error });
    }
  };

  const waText = encodeURIComponent(`Hola! Te mando el comprobante de la transferencia del pedido ${orderRef}.`);
  const amountArs = formatARS(totalArs);

  return (
    <div className="space-y-5 text-left">
      <div className="rounded-2xl bg-[#f5f5f7] p-5">
        <p className="text-[13px] text-gray-500">Total a transferir</p>
        <p className="mt-0.5 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-gray-900 tabular-nums">{amountArs}</p>
        <p className="text-[14px] text-gray-500 tabular-nums">US$ {totalUsd.toFixed(2)} al dólar oficial de hoy</p>
      </div>

      <div className="divide-y divide-[#d6d6d6] border-y border-[#d6d6d6]">
        <CopyRow label="Alias" value={account.aliasArs} />
        <CopyRow label="Monto en pesos" value={amountArs} copyValue={String(Math.round(totalArs))} />
        <div className="py-3.5">
          <p className="text-[13px] text-gray-500">Titular de la cuenta</p>
          <p className="text-[17px] font-semibold text-gray-900">{account.holder}</p>
        </div>
      </div>

      <details className="faq-item group border-b border-[#d6d6d6] pb-1">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-[15px] text-primary [&::-webkit-details-marker]:hidden">
          Pagar en dólares o con cripto
          <span className="transition-transform duration-200 group-open:rotate-90" aria-hidden>
            ›
          </span>
        </summary>
        <div className="divide-y divide-[#d6d6d6]">
          <CopyRow label="Alias en dólares" value={account.aliasUsd} />
          <CopyRow label="USDT (red Ethereum, ERC20)" value={account.cryptoWallet} mono />
          <p className="py-3 text-[14px] text-gray-500">En dólares o USDT el total es US$ {totalUsd.toFixed(2)}.</p>
        </div>
      </details>

      <div>
        <p className="text-[17px] font-semibold text-gray-900">Mandanos el comprobante</p>
        <p className="mt-1 text-[14px] text-gray-500">
          Con el comprobante confirmamos el pago y preparamos tu pedido. Sirve una captura, una foto o el PDF del banco.
        </p>
        {proof === 'done' ? (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-[#f5f5f7] p-4 text-[15px] font-semibold text-gray-900" role="status">
            <Check className="h-5 w-5 shrink-0" aria-hidden /> Comprobante recibido. Te avisamos cuando lo validemos.
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            <label className={`btn-apple w-full cursor-pointer ${proof === 'uploading' ? 'pointer-events-none opacity-60' : ''}`}>
              <Upload className="h-4 w-4" aria-hidden />
              {proof === 'uploading' ? 'Subiendo' : 'Subir comprobante'}
              <input
                type="file"
                accept={PROOF_ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                  // Para poder elegir de nuevo el mismo archivo si falló
                  e.target.value = '';
                }}
              />
            </label>
            <a
              href={`https://api.whatsapp.com/send?phone=${account.whatsappNumber}&text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('whatsapp_click', 'contact', { source: 'transfer_proof' })}
              className="btn-apple-ghost w-full"
            >
              Enviarlo por WhatsApp
            </a>
            {proof === 'error' && (
              <p className="text-[14px] text-red-600" role="alert">
                {proofError} También podés mandarlo por WhatsApp.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
