"use client";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Sheet, SheetHandleArea } from '@/components/ui/Sheet';
import { GarmentDiagram } from '@/components/pdp/GarmentDiagram';
import { MEASURE_HELP, formatCm, orderRows, rowFor, type GarmentKind, type SizeGuide as SizeGuideData } from '@/lib/sizeGuide';

const TIP: Record<GarmentKind, string> = {
  top: 'Medí una remera tuya que te quede bien, apoyada en plano, y comparala.',
  sweater: 'Medí un buzo tuyo que te quede bien, apoyado en plano, y comparalo.',
  bottom: 'Medí un pantalón tuyo que te quede bien, apoyado en plano, y comparalo.',
};

/**
 * "Guía de talles": la maqueta con las medidas del talle, la tabla de todos
 * los talles y cómo medir. Elegir un talle acá solo cambia lo que se mira, no
 * el talle elegido para comprar.
 *
 * Celular: hoja con todo en una columna. Escritorio: el dibujo grande a la
 * izquierda y la tabla con "Cómo medir" a la derecha, sin tener que scrollear.
 * Todos los talles se dibujan a la misma escala: al pasar de S a XL la prenda
 * crece de verdad.
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
  /** El talle elegido en la ficha (la guía arranca ahí) */
  selectedSize?: string | null;
  productTitle: string;
  /** Pantalón: pretina de jean o cintura elástica */
  waist?: 'button' | 'elastic';
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const titleId = `sg-title-${uid}`;
  const descId = `sg-desc-${uid}`;
  const rows = useMemo(() => orderRows(guide, sizes), [guide, sizes]);
  const initial = rowFor(guide, selectedSize)?.size ?? rows[0]?.size ?? '';
  const [active, setActive] = useState(initial);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);

  // Cada vez que se abre, arranca en el talle elegido en la ficha
  useEffect(() => {
    if (open) setActive(initial);
  }, [open, initial]);

  const row = rowFor(guide, active) ?? rows[0] ?? null;
  const help = MEASURE_HELP[kind];
  const many = rows.length > 1;
  const activeIndex = Math.max(0, rows.findIndex((r) => r.size === row?.size));

  // Selector de talle como grupo de opciones: las flechas cambian de talle
  const onRadioKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : step ? (activeIndex + step + rows.length) % rows.length : -1;
    if (to < 0) return;
    e.preventDefault();
    setActive(rows[to].size);
    radios.current[to]?.focus();
  };

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

      <div className="px-6 sm:px-8 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,340px)] md:items-start md:gap-10">
        <div>
          {many && (
            <div
              role="radiogroup"
              aria-label="Talle"
              className={cn('mt-5 gap-1 rounded-[12px] bg-[#f0f0f2] p-1', rows.length <= 5 ? 'grid' : 'flex overflow-x-auto')}
              style={rows.length <= 5 ? { gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` } : undefined}
            >
              {rows.map((r, i) => {
                const on = i === activeIndex;
                return (
                  <button
                    key={r.size}
                    ref={(el) => {
                      radios.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setActive(r.size)}
                    onKeyDown={onRadioKey}
                    className={cn(
                      'min-h-[44px] shrink-0 rounded-[9px] px-3 text-[15px] leading-tight transition-[background-color,box-shadow,color] duration-200',
                      on ? 'bg-white font-semibold text-gray-900 shadow-[0_1px_4px_rgba(0,0,0,0.12)]' : 'text-gray-600'
                    )}
                  >
                    {r.size}
                  </button>
                );
              })}
            </div>
          )}

          {row && (
            <div className={cn('mx-auto max-w-[400px] md:max-w-none', many ? 'mt-4' : 'mt-3 md:mt-5')}>
              <GarmentDiagram kind={kind} largo={row.largo} ancho={row.ancho} scaleTo={rows} waist={waist} />
            </div>
          )}
        </div>

        <div className="md:pt-5">
          {/* Todos los talles; el que se está mirando, resaltado */}
          <table className="mt-4 w-full border-separate border-spacing-0 text-[15px] tabular-nums md:mt-0">
            <caption className="sr-only">Medidas de la prenda por talle, en centímetros</caption>
            <thead>
              <tr className="text-[13px] text-gray-500">
                <th scope="col" className="pb-1.5 pl-3 text-left font-normal">Talle</th>
                <th scope="col" className="pb-1.5 text-right font-normal">Largo</th>
                <th scope="col" className="pb-1.5 pr-3 text-right font-normal">Ancho</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const on = i === activeIndex;
                return (
                  <tr
                    key={r.size}
                    onClick={many ? () => setActive(r.size) : undefined}
                    aria-current={on && many ? 'true' : undefined}
                    className={cn(
                      'transition-colors duration-150',
                      on ? 'bg-[#f5f5f7] text-gray-900' : 'text-gray-600',
                      many && 'cursor-pointer'
                    )}
                  >
                    <td className={cn('rounded-l-[10px] py-2.5 pl-3', on && 'font-semibold')}>{r.size}</td>
                    <td className="py-2.5 text-right">{formatCm(r.largo)}</td>
                    <td className="rounded-r-[10px] py-2.5 pr-3 text-right">{formatCm(r.ancho)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h3 className="mt-7 text-[17px] font-semibold tracking-[-0.022em]">Cómo medir</h3>
          <ol className="mt-3 space-y-3">
            {[
              { n: 1, name: 'Largo', text: help.largo },
              { n: 2, name: 'Ancho', text: help.ancho },
            ].map((m) => (
              <li key={m.n} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#0071e3] text-[13px] font-semibold text-[#0071e3] tabular-nums"
                >
                  {m.n}
                </span>
                <p className="text-[15px] leading-[1.4] text-gray-600">
                  <span className="font-semibold text-gray-900">{m.name}.</span> {m.text}
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
