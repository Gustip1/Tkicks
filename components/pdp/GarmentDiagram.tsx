import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { type GarmentKind } from '@/lib/sizeGuide';

/**
 * Dibujo de la prenda para la guía de talles: el plano de toda la vida de cada
 * tipo (remera, hoodie, sweater, zip hoodie, pantalón y short), siempre igual,
 * con dos líneas que marcan dónde se mide: 1 el largo y 2 el ancho. Los
 * centímetros van al costado, en la tabla (components/pdp/SizeGuide.tsx).
 *
 * Antes la silueta se armaba con las medidas de cada talle y llevaba los
 * números encima; el dueño prefirió el dibujo clásico (oct 2026).
 *
 * Dónde se mide:
 * - Arriba: largo del punto más alto del hombro (junto al cuello o a la
 *   capucha) al borde de abajo; ancho de axila a axila.
 * - Abajo: largo de la cintura al ruedo, por el costado; ancho de la cintura
 *   de lado a lado.
 *
 * Los trazos no escalan (se ven igual de finos en la guía que en el ícono) y
 * los números de las medidas van en HTML encima del dibujo: siempre del mismo
 * tamaño, como en la tabla y en "Cómo medir".
 */

const INK = '#1d1d1f';
const BLUE = '#0071e3';
const INSIDE = '#e8e8ed';
/** Espacio que se deja para el número de cada medida, en unidades del dibujo */
const BADGE = 11;

type P = [number, number];

const CX = 120;
const r1 = (n: number) => Math.round(n * 10) / 10;
const s = (p: P) => `${r1(p[0])} ${r1(p[1])}`;
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const mul = (a: P, k: number): P => [a[0] * k, a[1] * k];
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const unit = (a: P): P => mul(a, 1 / Math.hypot(a[0], a[1]));
const mir = (p: P): P => [2 * CX - p[0], p[1]];
const same = (p: P) => p;
/** Un trazo del lado izquierdo y su espejo */
const both = (d: (m: (p: P) => P) => string) => `${d(same)} ${d(mir)}`;

/** Donde se cruzan la recta p + t·u y la recta q + k·v */
function meet(p: P, u: P, q: P, v: P): P {
  const det = u[0] * v[1] - u[1] * v[0];
  const t = ((q[0] - p[0]) * v[1] - (q[1] - p[1]) * v[0]) / det;
  return add(p, mul(u, t));
}

interface Measure {
  a: P;
  b: P;
  badge: P;
  /** Líneas punteadas que llevan la medida hasta la prenda */
  ext?: string;
}

interface Flat {
  box: [number, number, number, number];
  outline: string;
  /** Lo que se ve por dentro: la espalda por el cuello, el interior de la capucha */
  inside?: string;
  /** Piezas con relleno propio encima de la prenda (presillas del pantalón) */
  patches?: string;
  seams: string;
  stitches: string;
  ribs?: string;
  cords?: string;
  aglets?: string;
  dots?: { p: P; r: number }[];
  /** Cierre del zip hoodie: de dónde a dónde baja */
  zipper?: [number, number];
  largo: Measure;
  ancho: Measure;
}

/**
 * Encuadre de la prenda. La proporción se limita a un rango (un pantalón no
 * queda como una tira ni un buzo como una franja) y se completa con aire.
 */
function frame(points: P[], pad = 12): Flat['box'] {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  let x = Math.min(...xs) - pad;
  let y = Math.min(...ys) - pad;
  let w = Math.max(...xs) + pad - x;
  let h = Math.max(...ys) + pad - y;
  const ratio = Math.min(1.4, Math.max(0.9, w / h));
  if (w / h < ratio) {
    x -= (h * ratio - w) / 2;
    w = h * ratio;
  } else {
    y -= (w / ratio - h) / 2;
    h = w / ratio;
  }
  return [r1(x), r1(y), r1(w), r1(h)];
}

// ── Prendas de arriba ────────────────────────────────────────────────────────

interface TopSpec {
  y0: number; // hombro junto al cuello
  n: number; // medio cuello, hasta la costura
  shoulder: P; // punta del hombro (lado izquierdo)
  armpit: P; // axila (lado izquierdo)
  hem: number; // borde de abajo
  band: number; // alto de la cintura acanalada; 0 = ruedo con pespunte
  angle: number; // inclinación de la manga, en grados desde la vertical
  sleeve: number; // largo de la manga por arriba
  cuffW: number; // ancho de la manga en la punta
  cuff: number; // alto del puño acanalado; 0 = manga corta con pespunte
}

function topBody(t: TopSpec) {
  const rad = (t.angle * Math.PI) / 180;
  const d: P = [-Math.sin(rad), Math.cos(rad)]; // a lo largo de la manga
  const across: P = [Math.cos(rad), Math.sin(rad)]; // de arriba a abajo de la manga
  const N: P = [CX - t.n, t.y0];
  const S = t.shoulder;
  const A = t.armpit;
  const O = add(S, mul(d, t.sleeve));
  const I = add(O, mul(across, t.cuffW));
  const under = unit(sub(A, I));
  const bandTop = t.hem - t.band;
  const H: P = [A[0] + (t.band ? 2.5 : 0), t.hem];

  const half: P[] = [S, O, I, A, ...(t.band ? [[A[0], bandTop] as P] : []), H];
  const body = `M ${s(N)} ${[...half, ...half.map(mir).reverse()].map((p) => `L ${s(p)}`).join(' ')} L ${s(mir(N))}`;

  // Puño acanalado, o pespunte de la manga corta
  const O2 = sub(O, mul(d, t.cuff || 4.5));
  const I2 = meet(O2, across, I, under);
  const cuffLine = both((m) => `M ${s(m(O2))} L ${s(m(I2))}`);

  const dy = A[1] - S[1];
  const armhole = both(
    (m) => `M ${s(m(S))} C ${s(m([S[0] + 1, S[1] + dy * 0.45]))} ${s(m([A[0] + 2, A[1] - dy * 0.25]))} ${s(m(A))}`
  );

  const ribs: string[] = [];
  if (t.cuff) {
    for (let i = 1; i < 5; i++) ribs.push(both((m) => `M ${s(m(lerp(O, I, i / 5)))} L ${s(m(lerp(O2, I2, i / 5)))}`));
  }
  const x0 = A[0];
  const x1 = 2 * CX - A[0];
  if (t.band) {
    const count = Math.round((x1 - x0) / 5.5);
    for (let i = 1; i < count; i++) {
      const x = x0 + ((x1 - x0) * i) / count;
      ribs.push(`M ${r1(x)} ${r1(bandTop + 0.8)} L ${r1(x)} ${r1(t.hem - 0.8)}`);
    }
  }

  return {
    N,
    A,
    O,
    I,
    bandTop,
    body,
    seams: [armhole, t.cuff ? cuffLine : '', t.band ? `M ${r1(x0)} ${r1(bandTop)} L ${r1(x1)} ${r1(bandTop)}` : ''].join(' '),
    stitches: [t.cuff ? '' : cuffLine, t.band ? '' : `M ${r1(x0)} ${r1(t.hem - 4.5)} L ${r1(x1)} ${r1(t.hem - 4.5)}`].join(' '),
    ribs: ribs.join(' '),
  };
}

/** Las dos medidas de arriba; `free` es hasta dónde baja el lugar libre para el número del largo */
function topMeasures(t: TopSpec, A: P, free: number): Pick<Flat, 'largo' | 'ancho'> {
  const ay = A[1] + 5;
  const x = CX + t.n;
  return {
    largo: { a: [x, t.y0], b: [x, t.hem], badge: [x, (ay + free) / 2] },
    ancho: { a: [A[0], ay], b: [2 * CX - A[0], ay], badge: [(A[0] + CX) / 2, ay] },
  };
}

/** Cuello redondo con su ribete */
function crew(N: P, y0: number, rib: number, drop: number) {
  const OL: P = [N[0] + rib * 0.9, y0 - 1.5];
  const OR = mir(OL);
  // De izquierda a derecha, desde (x0, y), bajando `depth` en el centro
  const front = (x0: number, y: number, depth: number) =>
    `C ${r1(x0 + 1.5)} ${r1(y + depth * 0.78)} ${r1(CX - (CX - x0) * 0.55)} ${r1(y + depth)} ${CX} ${r1(y + depth)} ` +
    `C ${r1(CX + (CX - x0) * 0.55)} ${r1(y + depth)} ${r1(2 * CX - x0 - 1.5)} ${r1(y + depth * 0.78)} ${r1(2 * CX - x0)} ${r1(y)}`;
  const backY = y0 + 5;
  return {
    // Cierra la silueta por la espalda, del lado derecho al izquierdo
    close: `L ${s(OR)} Q ${CX} ${r1(backY)} ${s(OL)} Z`,
    inside: `M ${s(OR)} Q ${CX} ${r1(backY)} ${s(OL)} ${front(OL[0], OL[1], drop - rib)} Z`,
    seams:
      `M ${s(N)} ${front(N[0], y0, drop)} M ${s(OL)} ${front(OL[0], OL[1], drop - rib)} ` +
      `M ${s(add(OL, [2, 2]))} Q ${CX} ${r1(backY + rib * 0.7)} ${s(add(OR, [-2, 2]))}`,
    stitches: `M ${s(add(N, [0.4, 3]))} ${front(N[0] + 0.4, y0 + 3, drop)}`,
  };
}

/** Capucha vista de frente, con la abertura que termina en punta sobre el pecho */
function hood(N: P, y0: number, h: number, v: number) {
  const n = CX - N[0];
  const top = y0 - h;
  // Abertura de la cara: `w` de ancho a media altura, `gap` debajo del borde de arriba
  const opening = (w: number, gap: number, tip: number) => {
    const half = (m: (p: P) => P) =>
      `C ${s(m([CX - 10, tip - 6]))} ${s(m([CX - w + 1, y0 - 4]))} ${s(m([CX - w, y0 - h * 0.45]))} ` +
      `C ${s(m([CX - w + 1, top + gap + 8]))} ${s(m([CX - 12, top + gap]))} ${s(m([CX, top + gap]))}`;
    // El lado derecho se recorre al revés: de arriba hacia la punta
    const right =
      `C ${s([CX + 12, top + gap])} ${s([CX + w - 1, top + gap + 8])} ${s([CX + w, y0 - h * 0.45])} ` +
      `C ${s([CX + w - 1, y0 - 4])} ${s([CX + 10, tip - 6])} ${s([CX, tip])}`;
    return `M ${CX} ${r1(tip)} ${half(same)} ${right}`;
  };
  return {
    close:
      `C ${s([CX + n + 14, y0 - h * 0.3])} ${s([CX + n * 1.15, top])} ${s([CX, top])} ` +
      `C ${s([CX - n * 1.15, top])} ${s([CX - n - 14, y0 - h * 0.3])} ${s(N)} Z`,
    inside: `${opening(n - 3, 8, y0 + v)} Z`,
    seams:
      // Borde de la capucha y costura con el cuerpo
      `${opening(n + 0.5, 4.5, y0 + v + 3)} ` +
      `M ${s(N)} C ${s([N[0] + 1, y0 + 13])} ${s([CX - 11, y0 + v + 7])} ${s([CX, y0 + v + 7])} ` +
      `C ${s([CX + 11, y0 + v + 7])} ${s([2 * CX - N[0] - 1, y0 + 13])} ${s(mir(N))}`,
    top,
  };
}

function cords(y0: number) {
  const L: P = [CX - 12.5, y0 + 7];
  const R = mir(L);
  return {
    cords:
      `M ${s(L)} C ${s([CX - 13.5, y0 + 20])} ${s([CX - 15.5, y0 + 34])} ${s([CX - 13.5, y0 + 46])} ` +
      `M ${s(R)} C ${s([CX + 13, y0 + 22])} ${s([CX + 12.5, y0 + 36])} ${s([CX + 14.5, y0 + 50])}`,
    aglets: `M ${s([CX - 13.5, y0 + 46])} L ${s([CX - 13, y0 + 52])} M ${s([CX + 14.5, y0 + 50])} L ${s([CX + 15, y0 + 56])}`,
    dots: [
      { p: L, r: 1.9 },
      { p: R, r: 1.9 },
    ],
  };
}

const REMERA: TopSpec = {
  y0: 30, n: 21, shoulder: [62, 40], armpit: [55, 86], hem: 200, band: 0,
  angle: 58, sleeve: 50, cuffW: 34, cuff: 0,
};

const ABRIGO: TopSpec = {
  y0: 66, n: 27, shoulder: [46, 82], armpit: [50, 132], hem: 232, band: 15,
  angle: 28, sleeve: 120, cuffW: 22, cuff: 13,
};

function remera(): Flat {
  const b = topBody(REMERA);
  const c = crew(b.N, REMERA.y0, 4, 20);
  const m = topMeasures(REMERA, b.A, REMERA.hem);
  return {
    box: frame([b.O, b.I, mir(b.O), mir(b.I), [CX, REMERA.y0 - 4], [CX, REMERA.hem]]),
    outline: `${b.body} ${c.close}`,
    inside: c.inside,
    seams: `${b.seams} ${c.seams}`,
    stitches: `${b.stitches} ${c.stitches}`,
    ...m,
  };
}

function sweater(): Flat {
  const t: TopSpec = { ...ABRIGO, y0: 30, n: 20, shoulder: [46, 46], armpit: [50, 96], hem: 196 };
  const b = topBody(t);
  const c = crew(b.N, t.y0, 6, 17);
  return {
    box: frame([b.O, b.I, mir(b.O), mir(b.I), [CX, t.y0 - 4], [CX, t.hem]]),
    outline: `${b.body} ${c.close}`,
    inside: c.inside,
    seams: `${b.seams} ${c.seams}`,
    stitches: `${b.stitches} ${c.stitches}`,
    ribs: b.ribs,
    ...topMeasures(t, b.A, b.bandTop),
  };
}

function hoodie(zip: boolean): Flat {
  const t = ABRIGO;
  const b = topBody(t);
  const v = 16;
  const h = hood(b.N, t.y0, 47, v);
  const k = cords(t.y0);
  // Bolsillo bajo: deja lugar para el número del largo entre el ancho y el bolsillo
  const pTop = b.bandTop - 34;
  // Bolsillo canguro, o uno a cada lado del cierre
  const pocket = zip
    ? both((m) => `M ${s(m([CX - 2.2, pTop]))} L ${s(m([CX - 30, pTop]))} L ${s(m([CX - 46, b.bandTop]))}`)
    : `M ${s([CX - 46, b.bandTop])} L ${s([CX - 30, pTop])} L ${s([CX + 30, pTop])} L ${s([CX + 46, b.bandTop])}`;
  const pocketStitch = zip
    ? both((m) => `M ${s(m([CX - 3, pTop + 3]))} L ${s(m([CX - 28.6, pTop + 3]))} L ${s(m([CX - 42.6, b.bandTop]))}`)
    : `M ${s([CX - 42.6, b.bandTop])} L ${s([CX - 28.6, pTop + 3])} L ${s([CX + 28.6, pTop + 3])} L ${s([CX + 42.6, b.bandTop])}`;
  return {
    box: frame([b.O, b.I, mir(b.O), mir(b.I), [CX, h.top], [CX, t.hem]]),
    outline: `${b.body} ${h.close}`,
    inside: h.inside,
    seams: `${b.seams} ${h.seams} ${pocket}`,
    stitches: `${b.stitches} ${pocketStitch}`,
    ribs: b.ribs,
    ...k,
    zipper: zip ? [t.y0 + v, t.hem] : undefined,
    ...topMeasures(t, b.A, pTop),
  };
}

// ── Prendas de abajo ─────────────────────────────────────────────────────────

interface BottomSpec {
  y0: number; // borde de arriba de la cintura
  w: number; // media cintura
  wb: number; // alto de la pretina
  hip: number; // media cadera
  crotch: number; // tiro (y de la entrepierna)
  hem: number; // ruedo
  out: number; // ruedo, lado de afuera (distancia al centro)
  inner: number; // ruedo, lado de adentro (distancia al centro)
}

function bottom(b: BottomSpec, elastic: boolean): Flat {
  const W0: P = [CX - b.w, b.y0];
  const W1: P = [CX - b.w, b.y0 + b.wb];
  const Hp: P = [CX - b.hip, b.y0 + b.wb + 26];
  const Ho: P = [CX - b.out, b.hem];
  const Hi: P = [CX - b.inner, b.hem];
  const C: P = [CX, b.crotch];
  const c1: P = [W1[0] - 1.5, W1[1] + 9];
  const c2: P = [Hp[0], Hp[1] - 10];

  const outline =
    `M ${s(W0)} L ${s(mir(W0))} L ${s(mir(W1))} C ${s(mir(c1))} ${s(mir(c2))} ${s(mir(Hp))} ` +
    `L ${s(mir(Ho))} L ${s(mir(Hi))} L ${s(C)} L ${s(Hi)} L ${s(Ho)} L ${s(Hp)} C ${s(c2)} ${s(c1)} ${s(W1)} Z`;

  const seams = [`M ${s(W1)} L ${s(mir(W1))}`, `M ${s([CX, W1[1]])} L ${s(C)}`];
  const stitches = [both((m) => `M ${s(m([Ho[0] + 0.4, b.hem - 5]))} L ${s(m([Hi[0] - 0.2, b.hem - 5]))}`)];
  const ribs: string[] = [];
  let patches: string | undefined;
  let extra: Partial<Flat> = {};

  if (elastic) {
    // Cintura elástica fruncida, cordón y bolsillos al costado
    for (let x = W0[0] + 4; x < 2 * CX - W0[0] - 2; x += 4) ribs.push(`M ${r1(x)} ${r1(b.y0 + 1.5)} L ${r1(x)} ${r1(W1[1] - 1.5)}`);
    seams.push(both((m) => `M ${s(m([W1[0] + 4, W1[1] + 3]))} L ${s(m([Hp[0] + 3.5, Hp[1] + 14]))}`));
    const L: P = [CX - 4.5, W1[1] - 3.5];
    extra = {
      cords:
        `M ${s(L)} C ${s([CX - 6, W1[1] + 5])} ${s([CX - 8, W1[1] + 12])} ${s([CX - 7, W1[1] + 20])} ` +
        `M ${s(mir(L))} C ${s([CX + 5, W1[1] + 6])} ${s([CX + 5.5, W1[1] + 14])} ${s([CX + 8, W1[1] + 22])}`,
      aglets: `M ${s([CX - 7, W1[1] + 20])} L ${s([CX - 6.6, W1[1] + 25])} M ${s([CX + 8, W1[1] + 22])} L ${s([CX + 8.5, W1[1] + 27])}`,
      dots: [
        { p: L, r: 1.6 },
        { p: mir(L), r: 1.6 },
      ],
    };
  } else {
    // Pretina de jean: presillas, botón, bragueta y bolsillos
    stitches.push(`M ${s([W0[0] + 1, b.y0 + 3])} L ${s([2 * CX - W0[0] - 1, b.y0 + 3])}`);
    stitches.push(`M ${s([CX + 8, W1[1]])} L ${s([CX + 8, C[1] - 22])} Q ${s([CX + 8, C[1] - 11])} ${s([CX, C[1] - 8])}`);
    seams.push(both((m) => `M ${s(m([W1[0] + 13, W1[1]]))} Q ${s(m([W1[0] + 13, W1[1] + 16]))} ${s(m([Hp[0] + 0.6, W1[1] + 20]))}`));
    patches = [CX - 26, CX + 26, W0[0] + 4, 2 * CX - W0[0] - 4]
      .map((x) => `M ${r1(x - 1.6)} ${r1(b.y0 - 1.5)} h 3.2 v ${r1(b.wb + 4)} h -3.2 Z`)
      .join(' ');
    extra = { dots: [{ p: [CX, b.y0 + b.wb / 2], r: 2.6 }] };
  }

  // Largo por el costado, afuera; ancho de la cintura, arriba
  const x = CX + Math.max(b.out, b.hip) + 13;
  const y = b.y0 - 13;
  const largo: Measure = {
    a: [x, b.y0],
    b: [x, b.hem],
    badge: [x, (b.y0 + b.hem) / 2],
    ext: `M ${r1(CX + b.w + 3)} ${r1(b.y0)} L ${r1(x + 5)} ${r1(b.y0)} M ${r1(CX + b.out + 3)} ${r1(b.hem)} L ${r1(x + 5)} ${r1(b.hem)}`,
  };
  const ancho: Measure = {
    a: [CX - b.w, y],
    b: [CX + b.w, y],
    badge: [CX, y],
    ext: both((m) => `M ${s(m([CX - b.w, b.y0 - 3]))} L ${s(m([CX - b.w, y - 5]))}`),
  };

  return {
    box: frame([Ho, mir(Ho), mir(Hp), [x + BADGE, b.hem], [CX, y - BADGE]]),
    outline,
    patches,
    seams: seams.join(' '),
    stitches: stitches.join(' '),
    ribs: ribs.join(' '),
    ...extra,
    largo,
    ancho,
  };
}

const PANTALON: BottomSpec = { y0: 30, w: 40, wb: 10, hip: 46, crotch: 110, hem: 236, out: 48, inner: 6 };
const SHORT: BottomSpec = { y0: 30, w: 40, wb: 12, hip: 47, crotch: 96, hem: 134, out: 54, inner: 6 };

// ── Dibujo ───────────────────────────────────────────────────────────────────

const cache = new Map<string, Flat>();

/** Pantalón: jean por defecto; short: cintura elástica por defecto */
function flatFor(kind: GarmentKind, waist?: 'button' | 'elastic'): Flat {
  const key = `${kind}-${waist ?? ''}`;
  let f = cache.get(key);
  if (!f) {
    f =
      kind === 'remera' ? remera()
      : kind === 'sweater' ? sweater()
      : kind === 'hoodie' ? hoodie(false)
      : kind === 'zip-hoodie' ? hoodie(true)
      : kind === 'short' ? bottom(SHORT, waist !== 'button')
      : bottom(PANTALON, waist === 'elastic');
    cache.set(key, f);
  }
  return f;
}

const NAMES: Record<GarmentKind, string> = {
  remera: 'Remera',
  hoodie: 'Hoodie',
  sweater: 'Sweater',
  'zip-hoodie': 'Zip hoodie',
  pantalon: 'Pantalón',
  short: 'Short',
};

const line = { vectorEffect: 'non-scaling-stroke', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Garment({ f, weight }: { f: Flat; weight: number }) {
  const detail = { ...line, fill: 'none', stroke: INK, strokeOpacity: 0.42, strokeWidth: weight * 0.66 };
  return (
    <>
      <path d={f.outline} fill="#fff" stroke={INK} strokeWidth={weight} {...line} />
      {f.inside && <path d={f.inside} fill={INSIDE} stroke={INK} strokeOpacity={0.55} strokeWidth={weight * 0.75} {...line} />}
      {f.ribs && <path d={f.ribs} {...detail} strokeOpacity={0.26} />}
      <path d={f.seams} {...detail} />
      <path d={f.stitches} {...detail} strokeOpacity={0.38} strokeDasharray="2 2.2" />
      {f.patches && <path d={f.patches} fill="#fff" stroke={INK} strokeOpacity={0.6} strokeWidth={weight * 0.66} {...line} />}
      {f.zipper && (
        <>
          <path d={`M ${CX - 2.2} ${f.zipper[0]} V ${f.zipper[1]} H ${CX + 2.2} V ${f.zipper[0]} Z`} fill="#fff" stroke={INK} strokeOpacity={0.55} strokeWidth={weight * 0.66} {...line} />
          <path d={`M ${CX} ${f.zipper[0] + 1} V ${f.zipper[1] - 1}`} fill="none" stroke={INK} strokeOpacity={0.45} strokeWidth={weight * 1.3} strokeDasharray="0.9 1.1" style={{ vectorEffect: 'non-scaling-stroke' }} />
          <rect x={CX - 2.8} y={f.zipper[0] + 1.5} width={5.6} height={11} rx={2.2} fill={INK} fillOpacity={0.78} />
        </>
      )}
      {f.cords && <path d={f.cords} fill="none" stroke={INK} strokeOpacity={0.7} strokeWidth={weight * 0.85} {...line} />}
      {f.aglets && <path d={f.aglets} fill="none" stroke={INK} strokeOpacity={0.8} strokeWidth={weight * 2} {...line} />}
      {f.dots?.map((d, i) => (
        <circle key={i} cx={d.p[0]} cy={d.p[1]} r={d.r} fill="#fff" stroke={INK} strokeOpacity={0.7} strokeWidth={weight * 0.66} style={{ vectorEffect: 'non-scaling-stroke' }} />
      ))}
    </>
  );
}

function MeasureLine({ m }: { m: Measure }) {
  const u = unit(sub(m.b, m.a));
  const p: P = [-u[1], u[0]];
  const head = (tip: P, dir: 1 | -1) => {
    const back = add(tip, mul(u, -5.5 * dir));
    return `M ${s(add(back, mul(p, 3.2)))} L ${s(tip)} L ${s(add(back, mul(p, -3.2)))}`;
  };
  return (
    <>
      {m.ext && <path d={m.ext} fill="none" stroke={BLUE} strokeOpacity={0.55} strokeWidth={1} strokeDasharray="2 2.5" {...line} />}
      <path d={`M ${s(m.a)} L ${s(m.b)} ${head(m.b, 1)} ${head(m.a, -1)}`} fill="none" stroke={BLUE} strokeWidth={1.6} {...line} />
    </>
  );
}

/** El número de una medida: en el dibujo, en la tabla y en "Cómo medir" */
export function MeasureBadge({ n, className, style }: { n: 1 | 2; className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#0071e3] text-[13px] font-semibold leading-none text-white tabular-nums',
        className
      )}
    >
      {n}
    </span>
  );
}

export function GarmentDiagram({
  kind,
  waist,
  maxHeight,
  className,
}: {
  kind: GarmentKind;
  /** Pantalón o short: pretina de jean o cintura elástica */
  waist?: 'button' | 'elastic';
  /** Alto máximo en px: el dibujo se achica sin deformarse (y los números lo siguen) */
  maxHeight?: number;
  className?: string;
}) {
  const f = flatFor(kind, waist);
  const [bx, by, bw, bh] = f.box;
  const at = (p: P): CSSProperties => ({ left: `${((p[0] - bx) / bw) * 100}%`, top: `${((p[1] - by) / bh) * 100}%` });
  return (
    <div
      className={cn('relative mx-auto', className)}
      style={maxHeight ? { width: `min(100%, ${Math.round((maxHeight * bw) / bh)}px)` } : undefined}
    >
      <svg viewBox={f.box.join(' ')} role="img" aria-label={`${NAMES[kind]}: la línea 1 marca el largo y la 2 el ancho`} style={svgStyle}>
        <Garment f={f} weight={1.5} />
        <MeasureLine m={f.largo} />
        <MeasureLine m={f.ancho} />
      </svg>
      <MeasureBadge n={1} className="absolute -translate-x-1/2 -translate-y-1/2 ring-2 ring-white" style={at(f.largo.badge)} />
      <MeasureBadge n={2} className="absolute -translate-x-1/2 -translate-y-1/2 ring-2 ring-white" style={at(f.ancho.badge)} />
    </div>
  );
}

const svgStyle = { display: 'block', width: '100%', height: 'auto' } as const;

/** La prenda sola, chica (fila de "Guía de talles" en la ficha). Decorativo. */
export function GarmentIcon({ kind, className }: { kind: GarmentKind; className?: string }) {
  const f = flatFor(kind);
  return (
    <svg viewBox={f.box.join(' ')} aria-hidden className={className} style={{ display: 'block' }}>
      <Garment f={{ ...f, stitches: '', ribs: undefined, cords: undefined, aglets: undefined, dots: undefined }} weight={1.1} />
    </svg>
  );
}
