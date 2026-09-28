"use client";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
   Piezas del panel de analíticas.

   Colores (validados con el validador de la skill dataviz: contraste, bandas de
   luminosidad y separación para daltonismo, todo PASS sobre blanco):
     serie 1 · visitas   #0066cc  (el azul de la tienda)
     serie 2 · contactos #e8590c
   El texto nunca lleva el color de la serie: la identidad la da la marca de
   color al lado (una línea corta o una barra).

   Movimiento: curva de Apple, entradas escalonadas, y todo se apaga con
   "reducir movimiento" del sistema.
   ──────────────────────────────────────────────────────────────────────── */

export const SERIES = { visits: '#0066cc', leads: '#e8590c' } as const;
const EASE = [0.28, 0.11, 0.32, 1] as const;
const INK = '#1d1d1f';
const INK_2 = '#6e6e73';
const GRID = '#ececee';

const nf = new Intl.NumberFormat('es-AR');

/* ── Número que cuenta hasta su valor ─────────────────────────────────────── */

export function AnimatedNumber({
  value,
  format = (n) => nf.format(Math.round(n)),
  duration = 1.1,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      from.current = value;
      return;
    }
    // Arranca desde el valor anterior: al cambiar de rango el número "viaja"
    const controls = animate(from.current, value, {
      duration,
      ease: EASE,
      onUpdate: setShown,
    });
    from.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);

  return <>{format(shown)}</>;
}

/* ── Variación contra el período anterior ─────────────────────────────────── */

export function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  if (!before) return <span className="text-xs text-[#86868b]">Sin datos para comparar</span>;
  const diff = ((now - before) / before) * 100;
  const up = diff > 1;
  const down = diff < -1;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  // Estado: siempre con ícono y texto, nunca sólo color
  const tone = up ? 'bg-[#e3f5e8] text-[#1a7f37]' : down ? 'bg-[#fdeceb] text-[#c4251c]' : 'bg-[#f0f0f2] text-[#6e6e73]';
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-[#86868b]">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${tone}`}>
        <Icon className="h-3 w-3" aria-hidden />
        {diff > 0 ? '+' : ''}
        {diff.toFixed(0)}%
      </span>
      vs {label}
    </span>
  );
}

/* ── Minigráfico de línea ─────────────────────────────────────────────────── */

export function Sparkline({ values, color = SERIES.visits }: { values: number[]; color?: string }) {
  const reduce = useReducedMotion();
  if (values.length < 2) return null;
  const w = 120;
  const h = 32;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 6)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-[120px] overflow-visible" aria-hidden>
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
      />
      <motion.circle
        cx={lx}
        cy={ly}
        r={3.5}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        initial={reduce ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, ease: EASE, delay: 1.3 }}
      />
    </svg>
  );
}

/* ── Tarjeta de indicador ─────────────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  format,
  sub,
  delta,
  trend,
  trendColor,
  index = 0,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  sub?: ReactNode;
  delta?: ReactNode;
  trend?: number[];
  trendColor?: string;
  index?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay: index * 0.07 }}
      className="rounded-[18px] bg-white p-5 md:p-6 flex flex-col gap-3"
    >
      <p className="text-[13px] font-semibold text-[#6e6e73]">{label}</p>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[34px] leading-none font-semibold tracking-[-0.02em] text-[#1d1d1f]">
          <AnimatedNumber value={value} format={format} />
        </p>
        {trend && <Sparkline values={trend} color={trendColor} />}
      </div>
      {sub && <p className="text-[13px] text-[#6e6e73] leading-snug">{sub}</p>}
      {delta}
    </motion.div>
  );
}

/* ── Tarjeta de sección ───────────────────────────────────────────────────── */

export function Card({
  title,
  help,
  aside,
  children,
  className = '',
}: {
  title: string;
  help?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    // Entra al cargar, no al scrollear: los datos tienen que estar visibles
    // siempre (una impresión o una captura nunca "entran en pantalla").
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
      className={`rounded-[18px] bg-white p-5 md:p-7 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">{title}</h2>
          {help && <p className="mt-1 text-[13px] text-[#6e6e73] leading-relaxed max-w-[60ch]">{help}</p>}
        </div>
        {aside}
      </div>
      {children}
    </motion.section>
  );
}

/* ── Lista de barras que crecen ───────────────────────────────────────────── */

export function BarList({
  rows,
  color = SERIES.visits,
  empty = 'Sin datos en este período.',
  unit = '',
}: {
  rows: { key: string; label: ReactNode; value: number; extra?: ReactNode }[];
  color?: string;
  empty?: string;
  unit?: string;
}) {
  const reduce = useReducedMotion();
  if (!rows.length) return <p className="text-[13px] text-[#86868b]">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3.5">
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <span className="min-w-0 truncate text-[14px] text-[#1d1d1f]">{r.label}</span>
            <span className="shrink-0 text-[14px] font-semibold text-[#1d1d1f] tabular-nums">
              {nf.format(r.value)}
              {unit}
              {r.extra && <span className="ml-2 font-normal text-[#86868b]">{r.extra}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#f0f0f2] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={reduce ? false : { width: 0 }}
              // Un valor en cero es una barra vacía, no un puntito
              animate={{ width: r.value ? `${Math.max((r.value / max) * 100, 1.5)}%` : '0%' }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.06 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── Embudo ───────────────────────────────────────────────────────────────── */

export function Funnel({ steps }: { steps: { label: string; hint: string; count: number }[] }) {
  const reduce = useReducedMotion();
  const top = Math.max(1, steps[0]?.count ?? 1);
  return (
    <ol className="space-y-4">
      {steps.map((st, i) => {
        const prev = i === 0 ? st.count : steps[i - 1].count;
        const share = (st.count / top) * 100;
        const conv = i === 0 ? 100 : prev ? (st.count / prev) * 100 : 0;
        return (
          <li key={st.label}>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <p className="min-w-0 text-[14px] text-[#1d1d1f]">
                <span className="font-semibold">{st.label}</span>
                <span className="ml-2 text-[13px] text-[#86868b]">{st.hint}</span>
              </p>
              <p className="shrink-0 text-[15px] font-semibold text-[#1d1d1f] tabular-nums">
                <AnimatedNumber value={st.count} />
              </p>
            </div>
            <div className="h-6 rounded-[6px] bg-[#f0f0f2] overflow-hidden">
              <motion.div
                className="h-full rounded-[6px]"
                // Pasos ordenados: el azul se aclara a medida que se angosta el embudo
                style={{ background: SERIES.visits, opacity: 1 - i * 0.14 }}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: st.count ? `${Math.max(share, 1.2)}%` : '0%' }}
                transition={{ duration: 1, ease: EASE, delay: 0.15 + i * 0.12 }}
              />
            </div>
            {i > 0 && (
              <p className="mt-1.5 text-[12px] text-[#6e6e73]">
                Siguió el <span className="font-semibold text-[#1d1d1f]">{conv.toFixed(conv < 10 ? 1 : 0)}%</span> del paso anterior
                {prev - st.count > 0 && <> · se fueron {nf.format(prev - st.count)}</>}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ── Selector de rango con indicador deslizante ───────────────────────────── */

export function RangeTabs<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const id = useId();
  return (
    <div role="tablist" aria-label="Período" className="inline-flex flex-wrap rounded-full bg-[#e8e8ed] p-1">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={`relative rounded-full px-3.5 py-1.5 text-[13px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] ${
              active ? 'font-semibold text-[#1d1d1f]' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`range-pill-${id}`}
                className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Tendencia: área + línea, con cursor y tooltip ────────────────────────── */

export interface TrendPoint {
  key: string;
  label: string;
  visits: number;
  leads: number;
}

function niceMax(v: number) {
  if (v <= 5) return 5;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

export function TrendChart({ data, height = 240 }: { data: TrendPoint[]; height?: number }) {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId().replace(/:/g, '');

  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const pad = { top: 12, right: 12, bottom: 28, left: 40 };
  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;
  const yMax = niceMax(Math.max(1, ...data.map((d) => d.visits)));
  const ticks = [0, yMax / 2, yMax];

  const x = (i: number) => pad.left + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.top + ih - (v / yMax) * ih;

  const { line, area, leadsLine } = useMemo(() => {
    const pts = data.map((d, i) => [x(i), y(d.visits)] as const);
    const l = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
    const a = pts.length
      ? `${l} L${pts[pts.length - 1][0].toFixed(1)},${(pad.top + ih).toFixed(1)} L${pts[0][0].toFixed(1)},${(pad.top + ih).toFixed(1)} Z`
      : '';
    const ll = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.leads).toFixed(1)}`).join(' ');
    return { line: l, area: a, leadsLine: ll };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, width, height, yMax]);

  if (!data.length) return <p className="text-[13px] text-[#86868b]">Sin datos en este período.</p>;

  // Las líneas se redibujan cuando cambian los DATOS, no al cambiar el ancho de
  // la ventana (si no, cada resize reiniciaba la animación desde cero).
  const drawKey = `${data.length}-${data[0].key}-${data[data.length - 1].key}-${data.reduce((a, d) => a + d.visits + d.leads, 0)}`;

  // Etiquetas del eje X: primera, del medio y última, sin amontonarse
  const labelIdx = data.length <= 7 ? data.map((_, i) => i) : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const i = data.length <= 1 ? 0 : Math.round(((px - pad.left) / iw) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  };

  const h = hover !== null ? data[hover] : null;
  const tipLeft = hover !== null ? Math.min(Math.max(x(hover), 90), width - 90) : 0;

  return (
    <div ref={wrap} className="relative">
      {/* Leyenda: dos series, así que siempre presente */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[13px] text-[#6e6e73]">
        <span className="inline-flex items-center gap-2">
          <span className="h-[2px] w-4 rounded-full" style={{ background: SERIES.visits }} />
          Visitas
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-[2px] w-4 rounded-full" style={{ background: SERIES.leads }} />
          Te contactaron
        </span>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="block touch-none select-none"
        role="img"
        aria-label="Visitas y contactos a lo largo del período"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`g-${gradId}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={SERIES.visits} stopOpacity={0.16} />
            <stop offset="100%" stopColor={SERIES.visits} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {/* Grilla: hairlines sólidas y recesivas */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={INK_2} className="tabular-nums">
              {nf.format(t)}
            </text>
          </g>
        ))}
        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize={11} fill={INK_2}>
            {data[i].label}
          </text>
        ))}

        <motion.path
          d={area}
          fill={`url(#g-${gradId})`}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.5 }}
        />
        <motion.path
          key={`v-${drawKey}`}
          d={line}
          fill="none"
          stroke={SERIES.visits}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.3, ease: EASE }}
        />
        <motion.path
          key={`l-${drawKey}`}
          d={leadsLine}
          fill="none"
          stroke={SERIES.leads}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.3, ease: EASE, delay: 0.25 }}
        />

        {/* Cursor: encuentra la fecha, no hace falta apuntarle a la línea */}
        {h && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + ih} stroke="#d2d2d7" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(h.visits)} r={4.5} fill={SERIES.visits} stroke="#fff" strokeWidth={2} />
            <circle cx={x(hover)} cy={y(h.leads)} r={4.5} fill={SERIES.leads} stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>

      {h && (
        <div
          className="pointer-events-none absolute top-8 z-10 -translate-x-1/2 rounded-[12px] bg-white/95 px-3.5 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur"
          style={{ left: `${(tipLeft / width) * 100}%` }}
        >
          <p className="text-[12px] text-[#6e6e73] mb-1">{h.label}</p>
          <p className="flex items-center gap-2 text-[13px]">
            <span className="h-[2px] w-3 rounded-full" style={{ background: SERIES.visits }} />
            <span className="font-semibold text-[#1d1d1f] tabular-nums">{nf.format(h.visits)}</span>
            <span className="text-[#6e6e73]">visitas</span>
          </p>
          <p className="flex items-center gap-2 text-[13px]">
            <span className="h-[2px] w-3 rounded-full" style={{ background: SERIES.leads }} />
            <span className="font-semibold text-[#1d1d1f] tabular-nums">{nf.format(h.leads)}</span>
            <span className="text-[#6e6e73]">contactos</span>
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Horas del día: columnas que crecen, el pico resaltado ────────────────── */

export function HourChart({ hours }: { hours: { hour: number; sessions: number }[] }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...hours.map((h) => h.sessions));
  const peak = hours.reduce((a, b) => (b.sessions > a.sessions ? b : a), hours[0]);
  if (!peak || peak.sessions === 0) return <p className="text-[13px] text-[#86868b]">Sin datos en este período.</p>;

  return (
    <div>
      <p className="mb-4 text-[13px] text-[#6e6e73]">
        Pico a las <span className="font-semibold text-[#1d1d1f]">{peak.hour} hs</span> ·{' '}
        {nf.format(peak.sessions)} visitas
      </p>
      <div className="relative flex h-36 items-end gap-[2px]">
        {hours.map((h, i) => {
          const isPeak = h.hour === peak.hour;
          return (
            <div
              key={h.hour}
              className="relative flex h-full flex-1 items-end justify-center"
              onPointerEnter={() => setHover(h.hour)}
              onPointerLeave={() => setHover(null)}
            >
              <motion.div
                className="w-full max-w-[24px] rounded-t-[4px]"
                style={{ background: SERIES.visits, opacity: isPeak || hover === h.hour ? 1 : 0.32, transformOrigin: 'bottom' }}
                initial={reduce ? false : { height: 0 }}
                animate={{ height: `${Math.max((h.sessions / max) * 100, h.sessions ? 2 : 0)}%` }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.025 }}
              />
              {hover === h.hour && (
                <div className="pointer-events-none absolute bottom-full mb-2 z-10 whitespace-nowrap rounded-[10px] bg-white px-2.5 py-1.5 text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.14)] ring-1 ring-black/5">
                  <span className="font-semibold text-[#1d1d1f] tabular-nums">{nf.format(h.sessions)}</span>
                  <span className="text-[#6e6e73]"> · {h.hour} hs</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-[#86868b] tabular-nums">
        <span>0 hs</span>
        <span>6 hs</span>
        <span>12 hs</span>
        <span>18 hs</span>
        <span>23 hs</span>
      </div>
    </div>
  );
}

/* ── Esqueleto de carga ───────────────────────────────────────────────────── */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[18px] bg-white/70 ${className}`} />;
}

export { INK, INK_2 };
