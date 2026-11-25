"use client";
import { useRef, useState } from 'react';
import { ExternalLink, FileText, Paperclip, X } from 'lucide-react';
import { isPdf, PROOF_ACCEPT, uploadProof } from '@/lib/images/prepareProof';

/**
 * Comprobante de pago de un pedido, en el panel.
 *
 * El cliente puede subirlo en la web al terminar la compra, pero muchas veces
 * lo manda por WhatsApp y entonces el pedido quedaba sin comprobante. Desde
 * acá el dueño lo adjunta (o lo cambia) para que quede guardado con el pedido.
 */
export function PaymentProof({ orderId, url, onChanged }: { orderId: string; url: string | null; onChanged: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    const result = await uploadProof(orderId, file);
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChanged();
  };

  const pdf = isPdf(url);

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <p className="mb-2 text-sm font-semibold text-gray-700">Comprobante de pago</p>

      {url ? (
        <div className="flex flex-wrap gap-2">
          {pdf ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <FileText className="h-4 w-4" aria-hidden /> Abrir el PDF
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              Ver comprobante
            </button>
          )}
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={uploading}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            <Paperclip className="h-4 w-4" aria-hidden /> {uploading ? 'Subiendo…' : 'Cambiar'}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Este pedido no tiene comprobante cargado. Si te lo mandaron por WhatsApp, adjuntalo acá y queda guardado con el pedido.
          </p>
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={uploading}
            className="mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <Paperclip className="h-4 w-4" aria-hidden /> {uploading ? 'Subiendo…' : 'Adjuntar comprobante'}
          </button>
        </>
      )}

      <input
        ref={input}
        type="file"
        accept={PROOF_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {open && url && !pdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 className="font-bold text-gray-900">Comprobante de pago</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* La imagen entera, con scroll si es más alta que la pantalla */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Comprobante de pago" className="mx-auto w-full max-w-md rounded-lg border border-gray-200" />
            </div>
            <div className="border-t border-gray-200 p-4">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4" aria-hidden /> Abrir en otra pestaña
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
