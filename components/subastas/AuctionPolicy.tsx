"use client";
import { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

/** Contenido de las bases y condiciones de las subastas. */
export function AuctionPolicyContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-gray-600">
      <p>
        En <span className="font-bold text-gray-900">Tkicks</span> habilitamos esta sección para
        brindarte la oportunidad de acceder a piezas exclusivas a precios considerablemente menores
        que su valor real de mercado. Queremos que esta dinámica sea justa, ágil y, sobre todo,
        respetuosa con todos los miembros de nuestra comunidad que realmente desean sumar estos
        artículos a su rotación.
      </p>
      <p>
        Dado el gran beneficio que representan estos precios, la participación en nuestras subastas
        exige un <span className="font-bold text-gray-900">compromiso de compra absoluto</span>.
      </p>

      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="flex items-center gap-2 font-black uppercase tracking-tight text-red-600">
          <AlertTriangle className="w-4 h-4" />
          Penalización por incumplimiento (tolerancia cero)
        </p>
        <p className="mt-2 text-gray-700">
          Todo usuario que resulte ganador de una subasta y no concrete el pago correspondiente en el
          tiempo establecido, o que intente cancelar su oferta, recibirá un{' '}
          <span className="font-bold text-red-600">baneo permanente y de por vida</span> en nuestra
          sección de subastas. Sin excepciones.
        </p>
      </div>

      <p>
        Implementamos esta medida estricta por respeto a la plataforma y a los demás participantes que
        pujaron legítimamente y perdieron la oportunidad de llevarse el producto por ofertas que no
        eran reales. Al ingresar un monto y hacer clic en ofertar, estás asumiendo la{' '}
        <span className="font-bold text-gray-900">responsabilidad total y legal de la compra</span>.
      </p>
      <p className="font-bold text-gray-900">
        Te invitamos a pujar de forma responsable y consciente.
      </p>
    </div>
  );
}

/** Modal con las bases y condiciones. */
export function AuctionPolicyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Bases y condiciones de las subastas"
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-black tracking-tight text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Políticas y compromiso de subastas
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="px-5 py-5 overflow-y-auto">
          <AuctionPolicyContent />
        </div>
        <div className="px-5 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-900 text-white font-black uppercase py-3 rounded-xl hover:bg-black transition-colors text-sm tracking-tight"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

/** Botón/enlace que abre el modal de bases y condiciones. */
export function AuctionPolicyTrigger({
  className = '',
  label = 'Bases y condiciones',
}: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <AuctionPolicyModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
