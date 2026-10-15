"use client";
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Sheet, SheetHandleArea } from '@/components/ui/Sheet';

/** Contenido de las bases y condiciones de las subastas. */
export function AuctionPolicyContent() {
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-gray-600">
      <p>
        En <span className="font-semibold text-gray-900">Tkicks</span> habilitamos esta sección para
        brindarte la oportunidad de acceder a piezas exclusivas a precios considerablemente menores
        que su valor real de mercado. Queremos que esta dinámica sea justa, ágil y, sobre todo,
        respetuosa con todos los miembros de nuestra comunidad que realmente desean sumar estos
        artículos a su rotación.
      </p>
      <p>
        Dado el gran beneficio que representan estos precios, la participación en nuestras subastas
        exige un <span className="font-semibold text-gray-900">compromiso de compra absoluto</span>.
      </p>

      <div className="rounded-[14px] bg-red-50 p-4">
        <p className="flex items-center gap-2 font-semibold text-red-600">
          <AlertTriangle className="w-4 h-4" />
          Penalización por incumplimiento (tolerancia cero)
        </p>
        <p className="mt-2 text-gray-700">
          Todo usuario que resulte ganador de una subasta y no concrete el pago correspondiente en el
          tiempo establecido, o que intente cancelar su oferta, recibirá un{' '}
          <span className="font-semibold text-red-600">baneo permanente y de por vida</span> en nuestra
          sección de subastas. Sin excepciones.
        </p>
      </div>

      <p>
        Implementamos esta medida estricta por respeto a la plataforma y a los demás participantes que
        pujaron legítimamente y perdieron la oportunidad de llevarse el producto por ofertas que no
        eran reales. Al ingresar un monto y hacer clic en ofertar, estás asumiendo la{' '}
        <span className="font-semibold text-gray-900">responsabilidad total y legal de la compra</span>.
      </p>
      <p className="font-semibold text-gray-900">
        Te invitamos a pujar de forma responsable y consciente.
      </p>
    </div>
  );
}

/** Bases y condiciones en la hoja común de popups (components/ui/Sheet). */
export function AuctionPolicyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="auction-policy-title" size="lg" flushBottom>
      <SheetHandleArea className="px-6 pt-4 sm:px-8 sm:pt-8">
        <h2 id="auction-policy-title" className="pr-10 text-[22px] sm:text-[26px] font-semibold leading-tight tracking-[-0.015em]">
          Bases y condiciones de las subastas
        </h2>
      </SheetHandleArea>
      <div className="px-6 pt-4 sm:px-8">
        <AuctionPolicyContent />
      </div>
      {/* Pie fijo sólido; la sombra blanca hacia arriba hace de borde suave donde el texto pasa por debajo */}
      <div className="sticky bottom-0 mt-4 bg-white px-6 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-16px_24px_#fff] sm:px-8 sm:pb-7">
        <button type="button" onClick={onClose} className="btn-apple w-full">
          Entendido
        </button>
      </div>
    </Sheet>
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
