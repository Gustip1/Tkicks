"use client";
import { useId, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Sheet, SheetHandleArea } from '@/components/ui/Sheet';
import { GarmentDiagram, MeasureBadge } from '@/components/pdp/GarmentDiagram';
import { MEASURE_HELP, formatNumber, orderRows, rowFor, type GarmentKind, type SizeGuide as SizeGuideData } from '@/lib/sizeGuide';

const TIP: Record<GarmentKind, string> = {
  remera: 'Medí una remera tuya que te quede bien, apoyada en plano, y comparala.',
  hoodie: 'Medí un buzo tuyo que te quede bien, apoyado en plano, y comparalo.',
  sweater: 'Medí un sweater tuyo que te quede bien, apoyado en plano, y comparalo.',
  'zip-hoodie': 'Medí un buzo tuyo que te quede bien, apoyado en plano, y comparalo.',
  pantalon: 'Medí un pantalón tuyo que te quede bien, apoyado en plano, y comparalo.',
  short: 'Medí un short tuyo que te quede bien, apoyado en plano, y comparalo.',
};

const COLUMNS = [
  { n: 1, name: 'Largo', key: 'largo' },
  { n: 2, name: 'Ancho', key: 'ancho' },
] as const;

/**
 * "Guía de talles": el dibujo de la prenda con las líneas 1 (largo) y 2
 * (ancho) y, al costado, la tabla con esas medidas para cada talle. El talle
 * elegido en la ficha aparece resaltado.
 *
 * Celular: dibujo y tabla lado a lado, "Cómo medir" abajo. Escritorio: el
 * dibujo grande a la izquierda; la tabla y "Cómo medir" a la derecha.
 */
export function SizeGuide({
  open,
  onClose,
  kind,
  guide,
  sizes,
  selectedSize,
  productTitle,
  waist,
}: {
  open: boolean;
  onClose: () => void;
  kind: GarmentKind;
  guide: SizeGuideData;
  /** Talles del producto, en su orden: ordenan la tabla */
  sizes: string[];
  /** El talle elegido en la ficha: se resalta en la tabla */
  selectedSize?: string | null;
  productTitle: string;
  /** Pantalón: pretina de jean o cintura elástica */
  waist?: 'button' | 'elastic';
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const titleId = `sg-title-${uid}`;
  const descId = `sg-desc-${uid}`;
  const rows = useMemo(() => orderRows(guide, sizes), [guide, sizes]);
  const current = rows.length > 1 ? rowFor(guide, selectedSize)?.size : null;
  const help = MEASURE_HELP[kind];

  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId} describedBy={descId} size="xl" flushBottom>
      <SheetHandleArea className="px-6 pt-4 sm:px-8 sm:pt-8">
        <h2 id={titleId} className="pr-10 text-[22px] sm:text-[26px] font-semibold leading-tight tracking-[-0.015em]">
          Guía de talles
        </h2>
        <p id={descId} className="mt-1.5 line-clamp-2 text-[15px] leading-snug text-gray-500">
          {productTitle}
        </p>
      </SheetHandleArea>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-6 [grid-template-areas:'draw_table'_'help_help'] sm:px-8 md:mt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)] md:gap-x-10 md:[grid-template-areas:'draw_table'_'draw_help']">
        <div className="rounded-[18px] bg-[#f5f5f7] px-2 py-3 [grid-area:draw] md:p-6">
          <GarmentDiagram kind={kind} waist={waist} maxHeight={380} />
        </div>

        <div className="[grid-area:table]">
          <table className="border-separate border-spacing-0 text-[15px] tabular-nums md:w-full">
            <caption className="sr-only">Medidas de la prenda por talle, en centímetros</caption>
            <thead>
              <tr className="text-[13px] text-gray-500">
                <th scope="col" className="pb-2 pl-2.5 pr-2 text-left align-bottom font-normal">Talle</th>
                {COLUMNS.map((c) => (
                  <th key={c.n} scope="col" className={cn('pb-2 pl-2 text-right align-bottom font-normal', c.n === 2 && 'pr-2.5')}>
                    <span className="inline-flex flex-col items-end gap-1 md:flex-row md:items-center md:gap-1.5">
                      <MeasureBadge n={c.n} />
                      {c.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const on = r.size === current;
                return (
                  <tr key={r.size} aria-current={on ? 'true' : undefined} className={on ? 'bg-[#f5f5f7] text-gray-900' : 'text-gray-600'}>
                    <td className={cn('whitespace-nowrap rounded-l-[10px] py-2.5 pl-2.5 pr-2', on && 'font-semibold')}>{r.size}</td>
                    {COLUMNS.map((c) => (
                      <td key={c.n} className={cn('py-2.5 pl-2 text-right', c.n === 2 && 'rounded-r-[10px] pr-2.5')}>
                        {formatNumber(r[c.key])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 pl-2.5 text-[13px] text-gray-500">Medidas en cm</p>
        </div>

        <div className="mt-7 [grid-area:help] md:mt-8">
          <h3 className="text-[17px] font-semibold tracking-[-0.022em]">Cómo medir</h3>
          <ol className="mt-3 space-y-3">
            {COLUMNS.map((c) => (
              <li key={c.n} className="flex gap-3">
                <MeasureBadge n={c.n} />
                <p className="text-[15px] leading-[1.4] text-gray-600">
                  <span className="font-semibold text-gray-900">{c.name}.</span> {help[c.key]}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[15px] leading-[1.4] text-gray-600">{TIP[kind]}</p>
          <p className="mt-2 text-[13px] leading-[1.4] text-gray-500">
            Son medidas de la prenda, no del cuerpo. Puede haber 1 o 2 cm de diferencia.
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 mt-4 bg-white px-6 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-16px_24px_#fff] sm:px-8 sm:pb-7 md:flex md:justify-end">
        <button type="button" onClick={onClose} className="btn-apple w-full md:w-auto md:min-w-[180px]">
          Listo
        </button>
      </div>
    </Sheet>
  );
}
