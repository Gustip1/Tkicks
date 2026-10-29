"use client";
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GarmentDiagram } from '@/components/pdp/GarmentDiagram';
import {
  MEASURE_HELP,
  extractFromDescription,
  formatCm,
  isBottom,
  parseSizeGuide,
  type GarmentKind,
  type SizeGuide,
  type SizeGuideRow,
} from '@/lib/sizeGuide';

/**
 * Editor de la guía de talles del admin: largo y ancho (cm) por talle, con la
 * maqueta de la ficha en vivo. También ofrece pasar a la guía las medidas que
 * estaban escritas a mano en la descripción.
 *
 * Los talles salen de las variantes. Los números se escriben como texto (para
 * aceptar "74,5" mientras se tipea) y hacia afuera sale siempre una guía ya
 * validada con parseSizeGuide, o null si no hay ninguna medida.
 */

const MIN_CM = 1;
const MAX_CM = 300;

type Field = 'largo' | 'ancho';
type Draft = { largo: string; ancho: string };
type Drafts = Record<string, Draft>;

const EMPTY: Draft = { largo: '', ancho: '' };
const keyOf = (size: string) => size.trim().toLowerCase();
const toDraft = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

/** Interpreta lo que se escribió: null si está vacío, NaN si no es una medida válida. */
function readCm(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  // Hasta 3 cifras y un decimal ("74,5"); "-5", "74,55" o "1.2.3" se marcan
  if (!/^\d{1,3}(\.\d?)?$/.test(t)) return NaN;
  const n = Number(t);
  if (!Number.isFinite(n) || n < MIN_CM || n > MAX_CM) return NaN;
  return Math.round(n * 10) / 10;
}
const validCm = (s: string) => {
  const n = readCm(s);
  return n === null || Number.isNaN(n) ? null : n;
};

/** Talles sin repetir ni vacíos, en el orden de las variantes. */
function uniqueSizes(sizes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of sizes) {
    const s = String(raw ?? '').trim();
    if (!s || seen.has(keyOf(s))) continue;
    seen.add(keyOf(s));
    out.push(s);
  }
  return out;
}

function draftsFrom(guide: SizeGuide | null): Drafts {
  const d: Drafts = {};
  for (const r of guide?.rows ?? []) d[keyOf(r.size)] = { largo: toDraft(r.largo), ancho: toDraft(r.ancho) };
  return d;
}

function buildGuide(drafts: Drafts, sizes: string[]): SizeGuide | null {
  return parseSizeGuide({
    rows: sizes.map((size) => {
      const d = drafts[keyOf(size)] ?? EMPTY;
      return { size, largo: validCm(d.largo), ancho: validCm(d.ancho) };
    }),
  });
}

const same = (a: SizeGuide | null, b: SizeGuide | null) => JSON.stringify(a) === JSON.stringify(b);
const pair = (r: { largo: number | null; ancho: number | null }) =>
  `${r.largo === null ? '—' : toDraft(r.largo)} × ${r.ancho === null ? '—' : toDraft(r.ancho)} cm`;

// ── Ayudas para el guardado (las usan las páginas del admin) ─────────────────

/** Deja solo los talles que existen en las variantes (y null si no queda ninguna medida). */
export function guideForSizes(guide: SizeGuide | null, sizes: string[]): SizeGuide | null {
  if (!guide) return null;
  const keys = new Set(uniqueSizes(sizes).map(keyOf));
  return parseSizeGuide({ rows: guide.rows.filter((r) => keys.has(keyOf(r.size))) });
}

/** ¿El error de Supabase es porque todavía no existe la columna products.size_guide? */
export function isMissingSizeGuideColumn(err: { message?: string; code?: string; details?: string } | null | undefined): boolean {
  if (!err) return false;
  const text = `${err.message ?? ''} ${err.details ?? ''}`;
  if (/size_guide/i.test(text)) return true;
  return (err.code === 'PGRST204' || err.code === '42703') && /column/i.test(text);
}

/** El primer campo de la guía con una medida inválida (para no guardar sin avisar). */
export function firstInvalidMeasure(): HTMLInputElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLInputElement>('[data-size-guide-editor] input[aria-invalid="true"]');
}

export const INVALID_MEASURE = 'Corregí las medidas marcadas en la guía de talles: no se guardó nada.';

/** El aviso cuando el producto se guardó pero la guía no (falta la migración). */
export const SIZE_GUIDE_NOT_SAVED =
  'Se guardó el producto, pero la guía de talles no: falta correr supabase/migration-size-guide.sql en Supabase.';

/**
 * Las medidas escritas como antes en la descripción ("Medidas Largo x Ancho /
 * 69 cm x 52 cm"), para no perderlas si la guía no se pudo guardar. La ficha
 * las vuelve a leer de ahí. Devuelve '' si no hay filas con las dos medidas.
 */
export function guideAsDescriptionText(guide: SizeGuide | null, sizes: string[]): string {
  const rows = (guide?.rows ?? []).filter((r) => r.largo !== null && r.ancho !== null);
  if (!rows.length) return '';
  const one = uniqueSizes(sizes).length === 1 && rows.length === 1;
  const lines = rows.map((r) =>
    one ? `${toDraft(r.largo)} cm x ${toDraft(r.ancho)} cm` : `Talle ${r.size}: ${toDraft(r.largo)} cm x ${toDraft(r.ancho)} cm`
  );
  return ['Medidas Largo x Ancho', ...lines].join('\n');
}

// ── Editor ───────────────────────────────────────────────────────────────────

const inputBase =
  'h-11 w-full rounded-xl border bg-gray-50 pl-3.5 pr-10 text-base text-gray-900 tabular-nums placeholder-gray-400 ' +
  'transition-[border-color,box-shadow,background-color] duration-150 ' +
  'focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

export function SizeGuideEditor({
  sizes,
  value,
  onChange,
  kind,
  waist,
  description,
  onDescriptionChange,
  columnMissing = false,
  unavailableMessage = 'Las zapatillas no llevan guía de medidas.',
}: {
  /** Talles de las variantes, en orden */
  sizes: string[];
  value: SizeGuide | null;
  onChange: (v: SizeGuide | null) => void;
  /** Qué prenda se dibuja; null = el producto no lleva guía */
  kind: GarmentKind | null;
  /** Pantalón o short: pretina de jean o cintura elástica */
  waist?: 'button' | 'elastic';
  description: string;
  onDescriptionChange: (d: string) => void;
  /** La base todavía no tiene la columna size_guide: se avisa y no se deja editar */
  columnMissing?: boolean;
  /** Qué decir cuando kind es null */
  unavailableMessage?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const list = useMemo(() => uniqueSizes(sizes), [sizes]);
  const listKey = list.join('\u0000');

  // Se guarda lo escrito de todos los talles que pasaron por acá: si un talle se
  // renombra y vuelve, sus medidas siguen. Hacia afuera solo salen los actuales.
  const [drafts, setDrafts] = useState<Drafts>(() => draftsFrom(value));
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ drafts: Drafts; description: string; after: string } | null>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastEmitted = useRef<SizeGuide | null>(value);
  const listRef = useRef(list);
  listRef.current = list;

  const emit = (next: Drafts) => {
    const g = buildGuide(next, listRef.current);
    if (same(g, lastEmitted.current)) return;
    lastEmitted.current = g;
    onChangeRef.current(g);
  };

  // Si la guía cambia desde afuera (se cargó el producto), se vuelve a leer
  useEffect(() => {
    if (same(value, lastEmitted.current)) return;
    lastEmitted.current = value;
    setDrafts(draftsFrom(value));
  }, [value]);

  // Si cambian los talles, la guía que sale se ajusta a los talles nuevos
  useEffect(() => {
    if (kind === null) return;
    const g = buildGuide(drafts, listRef.current);
    if (same(g, lastEmitted.current)) return;
    lastEmitted.current = g;
    onChangeRef.current(g);
    // drafts no va: cada edición ya avisa sola en emit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey, kind]);

  const setField = (size: string, field: Field, raw: string) => {
    // Se deja el "-" para que se marque como error en vez de borrarlo sin avisar
    const clean = raw.replace(/[^\d.,-]/g, '').slice(0, 6);
    const k = keyOf(size);
    const next = { ...drafts, [k]: { ...(drafts[k] ?? EMPTY), [field]: clean } };
    setDrafts(next);
    setUndo(null);
    emit(next);
  };

  // Medidas escritas en la descripción
  const found = useMemo(() => {
    if (kind === null || list.length === 0) return null;
    const { guide, cleaned } = extractFromDescription(description, list);
    if (!guide) return null;
    const keys = new Set(list.map(keyOf));
    const unknown = guide.rows.filter((r) => !keys.has(keyOf(r.size)));
    const rows = guide.rows
      .filter((r) => keys.has(keyOf(r.size)))
      .map((r) => {
        const d = drafts[keyOf(r.size)] ?? EMPTY;
        const cur = { largo: validCm(d.largo), ancho: validCm(d.ancho) };
        const clash = (f: Field) => r[f] !== null && cur[f] !== null && r[f] !== cur[f];
        const adds = (f: Field) => r[f] !== null && cur[f] === null;
        return { row: r, current: cur, conflict: clash('largo') || clash('ancho'), adds: adds('largo') || adds('ancho') };
      });
    return { rows, unknown, cleaned };
  }, [kind, list, description, drafts]);

  const conflicts = found?.rows.filter((r) => r.conflict) ?? [];
  const bringsSomething = found?.rows.some((r) => r.adds || r.conflict) ?? false;

  const passToGuide = (mode: 'fill' | 'replace') => {
    if (!found) return;
    const next: Drafts = { ...drafts };
    for (const { row } of found.rows) {
      const k = keyOf(row.size);
      const d = { ...(next[k] ?? EMPTY) };
      for (const f of ['largo', 'ancho'] as const) {
        if (row[f] === null) continue;
        if (mode === 'replace' || validCm(d[f]) === null) d[f] = toDraft(row[f]);
      }
      next[k] = d;
    }
    setUndo({ drafts, description, after: found.cleaned });
    setDrafts(next);
    emit(next);
    onDescriptionChange(found.cleaned);
    const first = found.rows[0]?.row.size;
    if (first) setActiveKey(keyOf(first));
  };

  const revert = () => {
    if (!undo) return;
    setDrafts(undo.drafts);
    emit(undo.drafts);
    onDescriptionChange(undo.description);
    setUndo(null);
  };

  const header = (
    <div className="flex items-start gap-3">
      <Ruler className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden />
      <div className="min-w-0">
        <h2 id={`sge-title-${uid}`} className="font-semibold text-gray-900">
          Guía de talles
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">Medidas de la prenda en cm, apoyada en plano. Se muestran en la ficha con el dibujo.</p>
      </div>
    </div>
  );

  if (kind === null) {
    return (
      <section aria-labelledby={`sge-title-${uid}`}>
        {header}
        <p className="mt-4 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600">{unavailableMessage}</p>
      </section>
    );
  }

  const missingBox = columnMissing && (
    <div role="status" className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <p className="text-sm leading-snug text-amber-900">
        La guía de talles todavía no se puede guardar: falta correr{' '}
        <span className="break-all font-medium">supabase/migration-size-guide.sql</span> en Supabase. Mientras tanto, la
        ficha sigue mostrando las medidas escritas en la descripción.
      </p>
    </div>
  );

  if (list.length === 0) {
    const inDescription = !!extractFromDescription(description, []).guide;
    return (
      <section aria-labelledby={`sge-title-${uid}`}>
        {header}
        {missingBox}
        <div className="mt-4 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
          <p className="font-medium text-gray-900">Primero cargá los talles en Variantes.</p>
          <p className="mt-0.5">
            {inDescription
              ? 'Hay medidas escritas en la descripción: cuando cargues el talle vas a poder pasarlas a la guía.'
              : 'Cada talle va a tener acá su largo y su ancho.'}
          </p>
        </div>
      </section>
    );
  }

  const active = list.find((s) => keyOf(s) === activeKey) ?? list[0];
  const activeDraft = drafts[keyOf(active)] ?? EMPTY;
  const preview: SizeGuideRow = { size: active, largo: validCm(activeDraft.largo), ancho: validCm(activeDraft.ancho) };
  const help = MEASURE_HELP[kind];
  const many = list.length > 1;
  const hdrL = `sge-l-${uid}`;
  const hdrA = `sge-a-${uid}`;

  return (
    <section aria-labelledby={`sge-title-${uid}`} data-size-guide-editor className="[container-type:inline-size]">
      {header}
      {missingBox}

      {/* Medidas en la descripción → guía */}
      {found && !columnMissing && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
          <p className="text-sm font-semibold text-gray-900">Encontramos medidas escritas en la descripción</p>
          <ul className="mt-1.5 space-y-0.5 text-sm text-gray-600 tabular-nums">
            {found.rows.map(({ row }) => (
              <li key={row.size}>
                <span className="font-medium text-gray-900">{row.size}</span>
                {': '}largo {formatCm(row.largo)}, ancho {formatCm(row.ancho)}
              </li>
            ))}
            {found.unknown.map((row) => (
              <li key={row.size}>
                <span className="font-medium text-gray-900">{row.size}</span>
                {': '}largo {formatCm(row.largo)}, ancho {formatCm(row.ancho)}
              </li>
            ))}
          </ul>

          {found.unknown.length > 0 ? (
            <p className="mt-2 text-sm text-gray-600">
              {found.unknown.length === 1 ? 'El talle ' : 'Los talles '}
              <span className="font-medium text-gray-900">{found.unknown.map((r) => r.size).join(', ')}</span>
              {found.unknown.length === 1 ? ' no está' : ' no están'} en Variantes. Agregalo en Variantes, o corregí el talle en la
              descripción, para poder pasar las medidas a la guía.
            </p>
          ) : conflicts.length > 0 ? (
            <>
              <div className="mt-2 space-y-0.5 text-sm text-gray-600">
                {conflicts.map((c) => (
                  <p key={c.row.size}>
                    El talle <span className="font-medium text-gray-900">{c.row.size}</span> ya tiene otras medidas en la guía (
                    <span className="tabular-nums">{pair(c.current)}</span>). ¿Cuáles querés dejar?
                  </p>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => passToGuide('replace')} className={btnPrimary}>
                  Usar las de la descripción
                </button>
                <button type="button" onClick={() => passToGuide('fill')} className={btnSecondary}>
                  Dejar las de la guía
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">En los dos casos se sacan de la descripción. Se guarda cuando apretás Guardar.</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-gray-600">
                {bringsSomething
                  ? 'Las pasamos a la guía y las sacamos de la descripción, así la ficha no las muestra dos veces.'
                  : 'Ya están cargadas en la guía. Podés sacarlas de la descripción para que la ficha no las muestre dos veces.'}
              </p>
              <div className="mt-3">
                <button type="button" onClick={() => passToGuide('fill')} className={btnPrimary}>
                  {bringsSomething ? 'Pasarlas a la guía' : 'Sacarlas de la descripción'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">No se guarda nada hasta que apretás Guardar.</p>
            </>
          )}
        </div>
      )}

      {/* Se puede deshacer mientras no se haya tocado nada más */}
      {undo && undo.after === description && (
        <div role="status" className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-gray-100 py-1.5 pl-4 pr-2">
          <p className="min-w-0 py-1.5 text-sm text-gray-700">
            Pasamos las medidas a la guía y las sacamos de la descripción. Se guarda cuando apretás Guardar.
          </p>
          <button type="button" onClick={revert} className="min-h-[44px] shrink-0 rounded-lg px-3 text-sm font-medium text-primary">
            Deshacer
          </button>
        </div>
      )}

      <fieldset
        disabled={columnMissing}
        className="mt-5 grid min-w-0 gap-5 [@container_(min-width:600px)]:grid-cols-[minmax(0,1fr)_minmax(0,300px)] [@container_(min-width:600px)]:items-start"
      >
        <legend className="sr-only">Medidas por talle</legend>

        {/* Filas: una por talle */}
        <div className="min-w-0">
          <div className="grid grid-cols-[minmax(0,4.5rem)_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-1 pb-1.5 text-xs font-medium text-gray-500">
            <span>Talle</span>
            <span id={hdrL}>Largo</span>
            <span id={hdrA}>Ancho</span>
          </div>
          <div className="space-y-2">
            {list.map((size) => {
              const k = keyOf(size);
              const d = drafts[k] ?? EMPTY;
              const on = many && k === keyOf(active);
              const bad = { largo: Number.isNaN(readCm(d.largo)), ancho: Number.isNaN(readCm(d.ancho)) };
              const l = validCm(d.largo);
              const a = validCm(d.ancho);
              const swapped = isBottom(kind) && l !== null && a !== null && a > l;
              const errId = `sge-err-${uid}-${k.replace(/[^a-z0-9]/g, '_')}`;
              const message =
                bad.largo || bad.ancho
                  ? `Poné un número entre ${MIN_CM} y ${MAX_CM}, por ejemplo 69 o 74,5.`
                  : swapped
                    ? '¿Están al revés? En un pantalón el largo suele ser mayor que el ancho.'
                    : null;

              return (
                <div key={k}>
                  <div className="grid grid-cols-[minmax(0,4.5rem)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveKey(k)}
                      aria-pressed={many ? on : undefined}
                      aria-label={`Ver el talle ${size} en el dibujo`}
                      tabIndex={many ? 0 : -1}
                      className={cn(
                        'flex h-11 min-w-0 items-center justify-center rounded-xl px-2 text-sm font-semibold transition-[background-color,color] duration-150',
                        on ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900',
                        !many && 'pointer-events-none'
                      )}
                    >
                      <span className="truncate" title={size}>
                        {size}
                      </span>
                    </button>
                    {(['largo', 'ancho'] as const).map((f) => (
                      <div key={f} className="relative min-w-0">
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          enterKeyHint="next"
                          aria-label={`${f === 'largo' ? 'Largo' : 'Ancho'} del talle ${size}, en cm`}
                          aria-invalid={bad[f] || undefined}
                          aria-describedby={message ? errId : undefined}
                          placeholder="—"
                          value={d[f]}
                          onFocus={() => setActiveKey(k)}
                          onChange={(e) => setField(size, f, e.target.value)}
                          className={cn(inputBase, bad[f] ? 'border-red-400 bg-red-50/40' : 'border-gray-200')}
                        />
                        <span aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          cm
                        </span>
                      </div>
                    ))}
                  </div>
                  {message && (
                    <p
                      id={errId}
                      className={cn('mt-1.5 pl-1 text-xs', bad.largo || bad.ancho ? 'text-red-600' : 'text-amber-700')}
                    >
                      {message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <dl className="mt-4 space-y-1.5 px-1 text-xs leading-snug text-gray-500">
            <div>
              <dt className="inline font-medium text-gray-700">Largo: </dt>
              <dd className="inline">{help.largo}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-gray-700">Ancho: </dt>
              <dd className="inline">{help.ancho}</dd>
            </div>
          </dl>
        </div>

        {/* Vista previa: el mismo dibujo que en la ficha */}
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900">Así se ve en la ficha</p>
            <p className="truncate text-sm text-gray-500">Talle {active}</p>
          </div>
          <div className="mx-auto mt-3 max-w-[360px] rounded-xl bg-[#f5f5f7] p-3">
            <GarmentDiagram kind={kind} waist={waist} maxHeight={240} />
          </div>
          <p className="mt-2 text-center text-xs text-gray-500 tabular-nums">
            {preview.largo === null && preview.ancho === null
              ? 'Cargá el largo (1) y el ancho (2) de este talle.'
              : `1 Largo ${formatCm(preview.largo)} · 2 Ancho ${formatCm(preview.ancho)}`}
          </p>
        </div>
      </fieldset>

      <p className="mt-4 text-xs text-gray-500">
        Si un talle queda vacío, la ficha no muestra medidas para ese talle. Se guarda junto con el producto.
      </p>
    </section>
  );
}

const btnPrimary =
  'inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-100 hover:bg-primary-hover active:scale-[0.97]';
const btnSecondary =
  'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 transition-[background-color,transform] duration-100 hover:bg-gray-50 active:scale-[0.97]';
