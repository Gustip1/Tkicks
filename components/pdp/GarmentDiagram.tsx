"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { formatCm, type GarmentKind } from '@/lib/sizeGuide';

/**
 * Maqueta de la prenda con sus medidas, como el plano de una ficha técnica.
 *
 * Se dibuja con las medidas reales: la proporción entre largo y ancho cambia
 * la silueta (una remera oversize se ve más ancha y con el hombro caído, una
 * musculosa más angosta), con límites para que nunca se deforme. Las cotas van
 * donde se mide de verdad:
 * - Remera: largo del punto más alto del hombro al ruedo (al costado, fuera
 *   de la prenda) y ancho de axila a axila, cruzando el pecho.
 * - Pantalón: largo de la cintura al ruedo por el costado y ancho de la
 *   cintura de lado a lado (arriba de la pretina).
 *
 * Al cambiar de talle la forma pasa de una medida a la otra en 280 ms
 * (ninguna transición si el sistema pide movimiento reducido). Con `scaleTo`
 * (todos los talles de la guía) la escala es la misma para todos: el talle
 * más chico se ve más chico, con los hombros a la misma altura.
 *
 * Pantalón: con `waist="button"` lleva pretina de jean (presillas, botón y
 * bragueta); con "elastic", cintura elástica con cordón (joggers y shorts).
 *
 * No depende de la ficha: lo usa también la vista previa del admin.
 */

const INK = '#1d1d1f';
const BLUE = '#0071e3';
const FILL = '#f5f5f7';
const INSIDE = '#e3e3e8';
const GUIDE = '#86868b';
const LABEL_GRAY = '#6e6e73';

/** Medidas típicas para dibujar cuando falta un dato (no se muestran como medida). */
const DEFAULTS: Record<GarmentKind, { largo: number; ancho: number; ratio: number }> = {
  top: { largo: 70, ancho: 54, ratio: 0.77 },
  bottom: { largo: 104, ancho: 42, ratio: 0.42 },
};

const NAMES: Record<GarmentKind, string> = { top: 'Remera', bottom: 'Pantalón' };

type Pt = [number, number];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const f = (n: number) => (Math.round(n * 100) / 100).toString();

/** Las medidas con las que se dibuja: las reales, o las típicas si falta alguna. */
function shapeInputs(kind: GarmentKind, largo: number | null, ancho: number | null): [number, number] {
  const d = DEFAULTS[kind];
  if (largo && ancho) return [largo, ancho];
  if (largo) return [largo, largo * d.ratio];
  if (ancho) return [ancho / d.ratio, ancho];
  return [d.largo, d.ancho];
}

// ── Transición entre talles ──────────────────────────────────────────────────

function useTweened(target: [number, number], ms = 280): [number, number] {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  const [a, b] = target;

  useEffect(() => {
    const from = current.current;
    if (from[0] === a && from[1] === b) return;
    const reduce =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      current.current = [a, b];
      setValue([a, b]);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - t, 4); // ease-out, como var(--ease-out)
      const next: [number, number] = [lerp(from[0], a, e), lerp(from[1], b, e)];
      current.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [a, b, ms]);

  return value;
}

// ── Geometría (en cm, con el origen arriba al centro) ────────────────────────

interface TopGeo {
  L: number;
  c: number; // medio ancho de pecho
  X: number; // punto más alejado del centro (puño de la manga)
  n: number; // medio ancho del cuello (hasta la costura)
  outline: string;
  inside: string;
  collar: string;
  collarStitch: string;
  backRib: string;
  armholes: string;
  sleeveStitches: string;
  hemStitch: string;
  chestY: number;
  sleeveBottomY: number;
}

function topGeometry(largo: number, ancho: number): TopGeo {
  const L = largo;
  const r = clamp(ancho / largo, 0.62, 1.2);
  const c = (L * r) / 2;
  // 0 = calce justo, 1 = oversize (hombro caído, manga más abierta)
  const t = clamp((r - 0.72) / (1.02 - 0.72), 0, 1);

  const n = 0.09 * L + 0.17 * c;
  const rb = 0.03 * L; // ancho del ribete del cuello
  const d = 0.125 * L; // caída del cuello adelante (hasta la costura)
  const bd = 0.026 * L; // caída del cuello atrás
  const sw = lerp(0.87, 1.05, t) * c;
  const sd = lerp(0.062, 0.075, t) * L;
  const a = (lerp(24, 31, t) * Math.PI) / 180;
  const sl = lerp(0.3, 0.24, t) * L;
  const so = lerp(0.24, 0.265, t) * L;
  const ad = lerp(0.34, 0.39, t) * L;

  const dir: Pt = [Math.cos(a), Math.sin(a)];
  const SP: Pt = [sw, sd];
  const ST: Pt = [SP[0] + sl * dir[0], SP[1] + sl * dir[1]];
  const SB: Pt = [ST[0] - so * dir[1], ST[1] + so * dir[0]];
  const AP: Pt = [c, ad];

  // Esquina de la axila redondeada
  const k = 0.018 * L;
  const ux = SB[0] - AP[0];
  const uy = SB[1] - AP[1];
  const ul = Math.hypot(ux, uy);
  const nearAP: Pt = [AP[0] + (ux / ul) * k, AP[1] + (uy / ul) * k];
  const hr = 0.008 * L;

  const R = (p: Pt) => `${f(p[0])} ${f(p[1])}`;
  const Lf = (p: Pt) => `${f(-p[0])} ${f(p[1])}`;

  const outline = [
    `M ${f(-n)} 0`,
    `Q 0 ${f(bd * 2)} ${f(n)} 0`,
    `L ${R(SP)}`,
    `L ${R(ST)}`,
    `L ${R(SB)}`,
    `L ${R(nearAP)}`,
    `Q ${R(AP)} ${f(c)} ${f(ad + k)}`,
    `L ${f(c)} ${f(L - hr)}`,
    `Q ${f(c)} ${f(L)} ${f(c - hr)} ${f(L)}`,
    `L ${f(-c + hr)} ${f(L)}`,
    `Q ${f(-c)} ${f(L)} ${f(-c)} ${f(L - hr)}`,
    `L ${f(-c)} ${f(ad + k)}`,
    `Q ${Lf(AP)} ${Lf(nearAP)}`,
    `L ${Lf(SB)}`,
    `L ${Lf(ST)}`,
    `L ${Lf(SP)}`,
    'Z',
  ].join(' ');

  // Interior del cuello: lo que se ve de la espalda entre el ribete de atrás y el de adelante
  const ni = n - rb;
  const y0 = rb * 0.5;
  const backInnerMid = bd + rb * 0.85;
  const backCtrl = 2 * backInnerMid - y0;
  const di = d - rb;
  const frontOpen = (from: number, to: number) =>
    `C ${f(from)} ${f(y0 + 0.62 * (di - y0))} ${f(0.56 * from)} ${f(di)} 0 ${f(di)} ` +
    `C ${f(0.56 * to)} ${f(di)} ${f(to)} ${f(y0 + 0.62 * (di - y0))} ${f(to)} ${f(y0)}`;
  const inside = `M ${f(-ni)} ${f(y0)} Q 0 ${f(backCtrl)} ${f(ni)} ${f(y0)} ${frontOpen(ni, -ni)} Z`;
  const backRib = `M ${f(-ni)} ${f(y0)} Q 0 ${f(backCtrl)} ${f(ni)} ${f(y0)}`;

  const collar =
    `M ${f(-n)} 0 C ${f(-n)} ${f(0.62 * d)} ${f(-0.56 * n)} ${f(d)} 0 ${f(d)} ` +
    `C ${f(0.56 * n)} ${f(d)} ${f(n)} ${f(0.62 * d)} ${f(n)} 0`;

  // Pespunte del cuello, apenas por debajo de la costura
  const off = 0.012 * L;
  const ns = n + off;
  const shoulderY = (x: number) => (sd * (x - n)) / (sw - n);
  const ds = d + off;
  const collarStitch =
    `M ${f(-ns)} ${f(shoulderY(ns))} C ${f(-ns)} ${f(0.62 * ds)} ${f(-0.56 * ns)} ${f(ds)} 0 ${f(ds)} ` +
    `C ${f(0.56 * ns)} ${f(ds)} ${f(ns)} ${f(0.62 * ds)} ${f(ns)} ${f(shoulderY(ns))}`;

  // Costura de la sisa (donde se une la manga)
  const arm = (s: 1 | -1) =>
    `M ${f(s * SP[0])} ${f(SP[1])} C ${f(s * (sw - 0.03 * c))} ${f(sd + 0.45 * (ad - sd))} ` +
    `${f(s * lerp(sw, c, 0.7))} ${f(ad - 0.14 * (ad - sd))} ${f(s * c)} ${f(ad)}`;
  const armholes = `${arm(1)} ${arm(-1)}`;

  // Pespunte del puño, paralelo al borde de la manga
  const ks = 0.028 * L;
  const p1: Pt = [ST[0] - dir[0] * ks, ST[1] - dir[1] * ks];
  const dot = (AP[0] - SB[0]) * dir[0] + (AP[1] - SB[1]) * dir[1];
  const u = -ks / dot;
  const p2: Pt = [SB[0] + (AP[0] - SB[0]) * u, SB[1] + (AP[1] - SB[1]) * u];
  const sleeveStitches = `M ${R(p1)} L ${R(p2)} M ${Lf(p1)} L ${Lf(p2)}`;

  const hy = L - 0.03 * L;
  const hemStitch = `M ${f(-c + 0.4)} ${f(hy)} L ${f(c - 0.4)} ${f(hy)}`;

  return {
    L,
    c,
    X: Math.max(ST[0], SB[0], c),
    n,
    outline,
    inside,
    collar,
    collarStitch,
    backRib,
    armholes,
    sleeveStitches,
    hemStitch,
    chestY: ad + 0.04 * L,
    sleeveBottomY: Math.max(SB[1], ST[1]),
  };
}

interface BottomGeo {
  L: number;
  w: number; // medio ancho de cintura
  X: number;
  ho: number; // borde de afuera del ruedo
  outline: string;
  band: string;
  bandStitch: string;
  loops: { x: number; y: number; w: number; h: number }[];
  button: { x: number; y: number; r: number };
  fly: string;
  flyStitch: string;
  pockets: string;
  hemStitch: string;
  /** Cintura elástica: frunces y cordón */
  gathers: string;
  cord: string;
  aglets: { x: number; y: number; w: number; h: number }[];
  bh: number;
  t: number;
}

function bottomGeometry(largo: number, ancho: number, elastic = false): BottomGeo {
  const L = largo;
  const w = (clamp(ancho / largo, 0.32, 1.05) * L) / 2;
  // 0 = short, 1 = pantalón largo
  const t = clamp((L / w - 2.4) / (4.6 - 2.4), 0, 1);

  const bh = (elastic ? 0.24 : 0.17) * w;
  const hp = lerp(1.08, 1.07, t) * w; // cadera
  const hy = 0.8 * w;
  const cr = Math.min(1.25 * w, 0.72 * L); // tiro
  const ho = lerp(1.12, 1.02, t) * w;
  const hemW = lerp(0.95, 0.84, t) * w;
  const hi = ho - hemW;
  const g = 0.018 * w; // ancho de la entrepierna (curva chica)

  const side = (s: 1 | -1, reverse: boolean) => {
    const pts = [
      `C ${f(s * (w + (hp - w) * 0.9))} ${f(0.35 * hy)} ${f(s * hp)} ${f(0.7 * hy)} ${f(s * hp)} ${f(hy)}`,
      `C ${f(s * hp)} ${f(hy + 0.35 * (L - hy))} ${f(s * ho)} ${f(L - 0.4 * (L - hy))} ${f(s * ho)} ${f(L)}`,
    ];
    if (!reverse) return pts.join(' ');
    // mismo trazo, del ruedo a la cintura
    return (
      `C ${f(s * ho)} ${f(L - 0.4 * (L - hy))} ${f(s * hp)} ${f(hy + 0.35 * (L - hy))} ${f(s * hp)} ${f(hy)} ` +
      `C ${f(s * hp)} ${f(0.7 * hy)} ${f(s * (w + (hp - w) * 0.9))} ${f(0.35 * hy)} ${f(s * w)} 0`
    );
  };
  const inseamUp = (s: 1 | -1) =>
    `C ${f(s * hi)} ${f(L - 0.55 * (L - cr))} ${f(s * (g * 2))} ${f(cr + 0.18 * (L - cr))} ${f(s * g)} ${f(cr + 0.8 * g + 0.012 * L)}`;
  const inseamDown = (s: 1 | -1) =>
    `C ${f(s * (g * 2))} ${f(cr + 0.18 * (L - cr))} ${f(s * hi)} ${f(L - 0.55 * (L - cr))} ${f(s * hi)} ${f(L)}`;

  const outline = [
    `M ${f(-w)} 0`,
    `L ${f(w)} 0`,
    side(1, false),
    `L ${f(hi)} ${f(L)}`,
    inseamUp(1),
    `Q 0 ${f(cr - 0.004 * L)} ${f(-g)} ${f(cr + 0.8 * g + 0.012 * L)}`,
    inseamDown(-1),
    `L ${f(-ho)} ${f(L)}`,
    side(-1, true),
    'Z',
  ].join(' ');

  const bandX = w + (hp - w) * 0.16;
  const band = `M ${f(-bandX)} ${f(bh)} L ${f(bandX)} ${f(bh)}`;
  const st = 0.22 * bh;
  const bandStitch = `M ${f(-w + 0.3)} ${f(st)} L ${f(w - 0.3)} ${f(st)} M ${f(-bandX + 0.3)} ${f(bh - st)} L ${f(bandX - 0.3)} ${f(bh - st)}`;

  const lw = 0.07 * w;
  const lh = bh * 1.25;
  const loops = [-0.82, -0.4, 0.4, 0.82].map((p) => ({ x: p * w - lw / 2, y: -bh * 0.12, w: lw, h: lh }));

  const fly = `M 0 ${f(bh)} L 0 ${f(cr * 0.86)}`;
  const fx = 0.17 * w;
  const flyStitch = `M ${f(fx)} ${f(bh + 0.15 * bh)} L ${f(fx)} ${f(cr * 0.6)} Q ${f(fx)} ${f(cr * 0.78)} 0.3 ${f(cr * 0.82)}`;

  const py = 0.74 * w;
  const pocketSide = w + (hp - w) * 0.97;
  const pocket = (s: 1 | -1) =>
    `M ${f(s * 0.58 * w)} ${f(bh)} C ${f(s * 0.6 * w)} ${f(0.52 * w)} ${f(s * 0.82 * w)} ${f(0.7 * w)} ${f(s * pocketSide)} ${f(py)}`;
  const pockets = `${pocket(1)} ${pocket(-1)}`;

  const hs = clamp(0.02 * L, 1.1, 2.3);
  const hemStitch =
    `M ${f(hi + 0.4)} ${f(L - hs)} L ${f(ho - 0.4)} ${f(L - hs)} ` + `M ${f(-hi - 0.4)} ${f(L - hs)} L ${f(-ho + 0.4)} ${f(L - hs)}`;

  // Elástico: frunces cortos repartidos en la pretina y un cordón con dos puntas
  const gathers = Array.from({ length: 13 }, (_, i) => {
    const x = -w + ((i + 1) * 2 * w) / 14;
    if (Math.abs(x) < 0.16 * w) return '';
    return `M ${f(x)} ${f(0.26 * bh)} L ${f(x)} ${f(0.74 * bh)}`;
  }).join(' ');
  const cy0 = bh * 0.62;
  const cl = clamp(0.62 * w, 7, 14);
  const cord =
    `M ${f(-0.07 * w)} ${f(cy0)} C ${f(-0.12 * w)} ${f(cy0 + 0.35 * cl)} ${f(-0.15 * w)} ${f(cy0 + 0.7 * cl)} ${f(-0.13 * w)} ${f(cy0 + cl)} ` +
    `M ${f(0.07 * w)} ${f(cy0)} C ${f(0.12 * w)} ${f(cy0 + 0.35 * cl)} ${f(0.1 * w)} ${f(cy0 + 0.75 * cl)} ${f(0.15 * w)} ${f(cy0 + 1.05 * cl)}`;
  const aw = 0.035 * w;
  const ah = 0.16 * cl;
  const aglets = [
    { x: -0.13 * w - aw / 2, y: cy0 + cl - 0.1 * ah, w: aw, h: ah },
    { x: 0.15 * w - aw / 2, y: cy0 + 1.05 * cl - 0.1 * ah, w: aw, h: ah },
  ];

  return {
    L,
    w,
    X: Math.max(hp, ho),
    ho,
    outline,
    band,
    bandStitch,
    loops,
    button: { x: 0, y: bh / 2, r: 0.3 * bh },
    fly,
    flyStitch,
    pockets,
    hemStitch,
    gathers,
    cord,
    aglets,
    bh,
    t,
  };
}

// ── Cotas ───────────────────────────────────────────────────────────────────

/** Ancho aproximado del texto (SF Pro semibold) para dimensionar la píldora. */
function textWidth(s: string, size: number) {
  let wdt = 0;
  for (const ch of s) {
    if (/[0-9]/.test(ch)) wdt += 0.6;
    else if (ch === ',' || ch === '.') wdt += 0.28;
    else if (ch === ' ') wdt += 0.27;
    else if (ch === 'm') wdt += 0.86;
    else if (ch === '—') wdt += 0.9;
    else wdt += 0.55;
  }
  return wdt * size;
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const al = Math.min(7, len / 3);
  const aw = al * 0.46;
  const head = (tx: number, ty: number, dx: number, dy: number) =>
    `M ${f(tx)} ${f(ty)} L ${f(tx - dx * al - dy * aw)} ${f(ty - dy * al + dx * aw)} L ${f(tx - dx * al + dy * aw)} ${f(ty - dy * al - dx * aw)} Z`;
  return (
    <g>
      <line
        x1={f(x1 + ux * (al - 1))}
        y1={f(y1 + uy * (al - 1))}
        x2={f(x2 - ux * (al - 1))}
        y2={f(y2 - uy * (al - 1))}
        stroke={BLUE}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path d={`${head(x1, y1, -ux, -uy)} ${head(x2, y2, ux, uy)}`} fill={BLUE} stroke={BLUE} strokeWidth={0.8} strokeLinejoin="round" />
    </g>
  );
}

function Label({
  x,
  y,
  value,
  name,
  namePos = 'below',
  halo = '#fff',
  compact,
  shadowId,
}: {
  x: number;
  y: number;
  value: string;
  name: string;
  namePos?: 'below' | 'above';
  /** Color del contorno del nombre: lo separa de la línea de la cota que pasa por detrás */
  halo?: string;
  compact?: boolean;
  shadowId: string;
}) {
  const size = compact ? 17 : 15;
  const h = compact ? 30 : 26;
  const w = Math.max(h * 1.6, textWidth(value, size) + (compact ? 24 : 22));
  return (
    <g transform={`translate(${f(x)} ${f(y)})`}>
      <rect
        x={f(-w / 2)}
        y={f(-h / 2)}
        width={f(w)}
        height={h}
        rx={h / 2}
        fill="#fff"
        stroke="rgba(0,0,0,0.08)"
        strokeWidth={0.75}
        filter={`url(#${shadowId})`}
      />
      <text
        x={0}
        y={0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size}
        fontWeight={600}
        fill={INK}
        style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}
      >
        {value}
      </text>
      {!compact && (
        <text
          x={0}
          y={namePos === 'below' ? h / 2 + 15 : -h / 2 - 7}
          textAnchor="middle"
          fontSize={12.5}
          fontWeight={600}
          fill={LABEL_GRAY}
          stroke={halo}
          strokeWidth={5}
          strokeLinejoin="round"
          paintOrder="stroke"
          style={{ letterSpacing: '0.01em' }}
        >
          {name}
        </text>
      )}
    </g>
  );
}

function Shadow({ id }: { id: string }) {
  return (
    <defs>
      <filter id={id} x="-30%" y="-40%" width="160%" height="200%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="1" stdDeviation="1.6" floodColor="#000" floodOpacity="0.1" />
      </filter>
    </defs>
  );
}

// ── Dibujos ─────────────────────────────────────────────────────────────────

const W = 360;
const H_TOP = 262;
const H_BOTTOM = 360;
const PAD_X = 8;
/** Medio ancho reservado para la píldora del largo (fijo: así el dibujo no salta cuando cambia el número). */
const PH = 38;

const ink = { stroke: INK, strokeOpacity: 0.78, strokeWidth: 1.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const seam = { stroke: INK, strokeOpacity: 0.32, strokeWidth: 1, fill: 'none', strokeLinecap: 'round' as const };
const stitch = { ...seam, strokeOpacity: 0.36, strokeDasharray: '2.4 2.6' };
const ext = { stroke: GUIDE, strokeOpacity: 0.7, strokeWidth: 1, strokeDasharray: '2 3' };

const TOP_GAP = 16;
const TOP_PAD_Y = 10;

/** Escala y ubicación comunes a todas las prendas de la lista (la actual y las de referencia). */
function topLayout(geos: TopGeo[]) {
  const Wa = W - 2 * PAD_X;
  const s = Math.min(
    ...geos.map((g) => Math.min((Wa - TOP_GAP - PH) / (2 * g.X), (Wa - 2 * PH - 10) / (g.X + g.c), (H_TOP - 2 * TOP_PAD_Y) / g.L))
  );
  const reachOf = (g: TopGeo) => Math.max(g.X * s + TOP_GAP, g.c * s + PH + 10); // del centro a la línea del largo
  const X = Math.max(...geos.map((g) => g.X));
  const reach = Math.max(...geos.map(reachOf));
  const cw = X * s + reach + PH;
  const ox = (W - cw) / 2 + X * s;
  const H = Math.ceil(Math.max(...geos.map((g) => g.L)) * s + 2 * TOP_PAD_Y);
  return { s, ox, oy: TOP_PAD_Y, H, reachOf };
}

function TopDrawing({ g, layout, largoTxt, anchoTxt, compact, shadowId }: { g: TopGeo; layout: ReturnType<typeof topLayout>; largoTxt: string; anchoTxt: string; compact?: boolean; shadowId: string }) {
  const { s, ox, oy } = layout;
  const reach = layout.reachOf(g);
  const sw = 1 / s; // trazos en unidades de pantalla aunque el dibujo esté escalado

  const lx = ox + reach;
  const top = oy;
  const bottom = oy + g.L * s;
  const hpsX = ox + g.n * s;
  const sideX = ox + g.c * s;
  // La etiqueta del largo, a la altura del cuerpo (debajo de la manga)
  const h = compact ? 30 : 26;
  const labelBlock = compact ? h : h + 22;
  const minY = oy + g.sleeveBottomY * s + h / 2 + 10;
  const maxY = bottom - labelBlock + h / 2 - 6;
  const ly = clamp((top + bottom) / 2, minY, Math.max(minY, maxY));
  const cy = oy + g.chestY * s;

  return (
    <>
      <g transform={`translate(${f(ox)} ${f(oy)}) scale(${f(s)})`}>
        <path d={g.outline} fill={FILL} {...ink} strokeWidth={1.5 * sw} />
        <path d={g.inside} fill={INSIDE} {...ink} strokeWidth={1.2 * sw} />
        <path d={g.collar} fill="none" {...ink} strokeWidth={1.2 * sw} />
        <path d={g.collarStitch} {...stitch} strokeWidth={sw} strokeDasharray={`${2.4 * sw} ${2.6 * sw}`} />
        <path d={g.armholes} {...seam} strokeWidth={sw} />
        <path d={g.sleeveStitches} {...stitch} strokeWidth={sw} strokeDasharray={`${2.4 * sw} ${2.6 * sw}`} />
        <path d={g.hemStitch} {...stitch} strokeWidth={sw} strokeDasharray={`${2.4 * sw} ${2.6 * sw}`} />
      </g>

      {/* Largo: del hombro al ruedo, al costado */}
      <line x1={f(hpsX + 4)} y1={f(top)} x2={f(lx + 7)} y2={f(top)} {...ext} />
      <line x1={f(sideX + 4)} y1={f(bottom)} x2={f(lx + 7)} y2={f(bottom)} {...ext} />
      <Arrow x1={lx} y1={top} x2={lx} y2={bottom} />
      <Label x={lx} y={ly} value={largoTxt} name="Largo" compact={compact} shadowId={shadowId} />

      {/* Ancho: de axila a axila */}
      <Arrow x1={ox - g.c * s + 1} y1={cy} x2={ox + g.c * s - 1} y2={cy} />
      <Label x={ox} y={cy} value={anchoTxt} name="Ancho" halo={FILL} compact={compact} shadowId={shadowId} />
    </>
  );
}

function bottomLayout(geos: BottomGeo[], compact?: boolean) {
  const Wa = W - 2 * PAD_X;
  const topReserve = compact ? 40 : 60;
  const s = Math.min(...geos.map((g) => Math.min((Wa - 2 * PH - 10) / (2 * g.X), (H_BOTTOM - topReserve - 14) / g.L)));
  const X = Math.max(...geos.map((g) => g.X));
  const cw = 2 * X * s + 2 * PH + 10;
  const ox = (W - cw) / 2 + X * s;
  const H = Math.ceil(topReserve + Math.max(...geos.map((g) => g.L)) * s + 14);
  return { s, ox, oy: topReserve, H };
}

function BottomDrawing({ g, layout, elastic, largoTxt, anchoTxt, compact, shadowId }: { g: BottomGeo; layout: ReturnType<typeof bottomLayout>; elastic: boolean; largoTxt: string; anchoTxt: string; compact?: boolean; shadowId: string }) {
  const { s, ox, oy } = layout;
  const reach = g.X * s + PH + 10;
  const sw = 1 / s;

  const lx = ox + reach;
  const top = oy;
  const bottom = oy + g.L * s;
  const waistR = ox + g.w * s;
  const waistL = ox - g.w * s;
  const ay = oy - (compact ? 22 : 24);

  return (
    <>
      <g transform={`translate(${f(ox)} ${f(oy)}) scale(${f(s)})`}>
        <path d={g.outline} fill={FILL} {...ink} strokeWidth={1.5 * sw} />
        {!elastic &&
          g.loops.map((l, i) => (
            <rect key={i} x={f(l.x)} y={f(l.y)} width={f(l.w)} height={f(l.h)} rx={f(l.w * 0.25)} fill={FILL} {...ink} strokeWidth={1.1 * sw} />
          ))}
        <path d={g.band} fill="none" {...ink} strokeWidth={1.2 * sw} />
        {elastic ? (
          <>
            <path d={g.gathers} {...seam} strokeWidth={sw} strokeOpacity={0.3} />
            <path d={g.cord} fill="none" stroke={INK} strokeOpacity={0.7} strokeWidth={1.3 * sw} strokeLinecap="round" />
            {g.aglets.map((a, i) => (
              <rect key={i} x={f(a.x)} y={f(a.y)} width={f(a.w)} height={f(a.h)} rx={f(a.w * 0.4)} fill={INK} fillOpacity={0.7} />
            ))}
          </>
        ) : (
          <>
            <path d={g.bandStitch} {...stitch} strokeWidth={sw} strokeDasharray={`${2.4 * sw} ${2.6 * sw}`} />
            <circle cx={f(g.button.x)} cy={f(g.button.y)} r={f(g.button.r)} fill="#fff" {...ink} strokeWidth={1.1 * sw} />
            <path d={g.fly} {...seam} strokeWidth={1.1 * sw} strokeOpacity={0.45} />
            <path d={g.flyStitch} {...stitch} strokeWidth={sw} strokeDasharray={`${2.4 * sw} ${2.6 * sw}`} />
          </>
        )}
        <path d={g.pockets} {...seam} strokeWidth={1.1 * sw} strokeOpacity={0.5} />
        <path d={g.hemStitch} {...stitch} strokeWidth={sw} strokeDasharray={`${2.4 * sw} ${2.6 * sw}`} />
      </g>

      {/* Largo: de la cintura al ruedo, por el costado */}
      <line x1={f(waistR + 4)} y1={f(top)} x2={f(lx + 7)} y2={f(top)} {...ext} />
      <line x1={f(ox + g.ho * s + 4)} y1={f(bottom)} x2={f(lx + 7)} y2={f(bottom)} {...ext} />
      <Arrow x1={lx} y1={top} x2={lx} y2={bottom} />
      <Label x={lx} y={(top + bottom) / 2} value={largoTxt} name="Largo" compact={compact} shadowId={shadowId} />

      {/* Ancho: la cintura de lado a lado */}
      <line x1={f(waistL)} y1={f(top - 4)} x2={f(waistL)} y2={f(ay - 7)} {...ext} />
      <line x1={f(waistR)} y1={f(top - 4)} x2={f(waistR)} y2={f(ay - 7)} {...ext} />
      <Arrow x1={waistL} y1={ay} x2={waistR} y2={ay} />
      <Label x={ox} y={ay} value={anchoTxt} name="Ancho" namePos="above" compact={compact} shadowId={shadowId} />
    </>
  );
}

type Measures = { largo: number | null; ancho: number | null };

export function GarmentDiagram({
  kind,
  largo,
  ancho,
  scaleTo,
  waist,
  className,
  compact,
}: {
  kind: GarmentKind;
  largo: number | null;
  ancho: number | null;
  /** Todos los talles de la guía: se dibujan a la misma escala, así se nota la diferencia */
  scaleTo?: Measures[];
  /** Pantalón: pretina de jean o cintura elástica. Si no se dice, elástica en shorts */
  waist?: 'button' | 'elastic';
  className?: string;
  /** Para usarlo chico: solo los números, sin los nombres de las medidas */
  compact?: boolean;
}) {
  const rawId = useId();
  const shadowId = `gd-shadow-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [gl, ga] = useTweened(shapeInputs(kind, largo, ancho));
  const largoTxt = formatCm(largo);
  const anchoTxt = formatCm(ancho);
  const said = (n: number | null) => (n === null ? 'sin dato' : formatCm(n));
  const label = `${NAMES[kind]}: largo ${said(largo)}, ancho ${said(ancho)}`;
  const refs = (scaleTo ?? []).filter((m) => m.largo || m.ancho).map((m) => shapeInputs(kind, m.largo, m.ancho));

  if (kind === 'top') {
    const g = topGeometry(gl, ga);
    const layout = topLayout([g, ...refs.map(([l, a]) => topGeometry(l, a))]);
    return (
      <svg viewBox={`0 0 ${W} ${layout.H}`} role="img" aria-label={label} className={className} style={svgStyle}>
        <Shadow id={shadowId} />
        <TopDrawing g={g} layout={layout} largoTxt={largoTxt} anchoTxt={anchoTxt} compact={compact} shadowId={shadowId} />
      </svg>
    );
  }

  const probe = bottomGeometry(gl, ga);
  const elastic = waist ? waist === 'elastic' : probe.t < 0.5;
  const g = bottomGeometry(gl, ga, elastic);
  const layout = bottomLayout([g, ...refs.map(([l, a]) => bottomGeometry(l, a, elastic))], compact);
  return (
    <svg viewBox={`0 0 ${W} ${layout.H}`} role="img" aria-label={label} className={className} style={svgStyle}>
      <Shadow id={shadowId} />
      <BottomDrawing g={g} layout={layout} elastic={elastic} largoTxt={largoTxt} anchoTxt={anchoTxt} compact={compact} shadowId={shadowId} />
    </svg>
  );
}

const svgStyle = { display: 'block', width: '100%', height: 'auto', fontFamily: 'inherit' } as const;

/**
 * Ícono de la prenda con sus dos cotas, sin números (para filas compactas,
 * como la de "Guía de talles" en la ficha). Decorativo: el texto de al lado
 * dice las medidas.
 */
export function GarmentIcon({ kind, className }: { kind: GarmentKind; className?: string }) {
  const S = 40;
  if (kind === 'top') {
    const g = topGeometry(70, 54);
    const s = 30 / (2 * g.X);
    const ox = S / 2;
    const oy = (S - g.L * s) / 2;
    const cy = oy + g.chestY * s;
    return (
      <svg viewBox={`0 0 ${S} ${S}`} aria-hidden className={className} style={{ display: 'block' }}>
        <path d={g.outline} transform={`translate(${f(ox)} ${f(oy)}) scale(${f(s)})`} fill={FILL} stroke={INK} strokeOpacity={0.8} strokeWidth={1.3 / s} strokeLinejoin="round" />
        <path d={g.collar} transform={`translate(${f(ox)} ${f(oy)}) scale(${f(s)})`} fill="none" stroke={INK} strokeOpacity={0.8} strokeWidth={1.1 / s} />
        <line x1={f(ox - g.c * s + 1.6)} y1={f(cy)} x2={f(ox + g.c * s - 1.6)} y2={f(cy)} stroke={BLUE} strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    );
  }
  const g = bottomGeometry(104, 42);
  const s = 32 / g.L;
  const ox = S / 2;
  const oy = (S - g.L * s) / 2;
  return (
    <svg viewBox={`0 0 ${S} ${S}`} aria-hidden className={className} style={{ display: 'block' }}>
      <path d={g.outline} transform={`translate(${f(ox)} ${f(oy)}) scale(${f(s)})`} fill={FILL} stroke={INK} strokeOpacity={0.8} strokeWidth={1.3 / s} strokeLinejoin="round" />
      <path d={g.band} transform={`translate(${f(ox)} ${f(oy)}) scale(${f(s)})`} fill="none" stroke={INK} strokeOpacity={0.8} strokeWidth={1.1 / s} />
      <line x1={f(ox + g.X * s + 3)} y1={f(oy + 0.6)} x2={f(ox + g.X * s + 3)} y2={f(oy + g.L * s - 0.6)} stroke={BLUE} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
