/**
 * Guía de talles: las medidas de la prenda (largo y ancho, en cm) por talle.
 *
 * Se guarda en `products.size_guide` (jsonb) con la forma { rows: [...] } y se
 * carga desde el admin. Antes las medidas iban escritas a mano en la
 * descripción ("Medidas Largo x Ancho\n69 cm x 52 cm"); `extractFromDescription`
 * las lee de ahí para migrarlas y para el botón "Pasar a la guía" del admin.
 *
 * Cómo se miden (la prenda apoyada en plano):
 * - Arriba (remeras, buzos, camperas): largo = del punto más alto del hombro
 *   al ruedo; ancho = de axila a axila.
 * - Abajo (pantalones, shorts): largo = de la cintura al ruedo por el costado;
 *   ancho = la cintura de lado a lado.
 */

/** Qué dibujo lleva la guía: uno por tipo de prenda */
export type GarmentKind = 'remera' | 'hoodie' | 'sweater' | 'zip-hoodie' | 'pantalon' | 'short';

export interface SizeGuideRow {
  size: string;
  largo: number | null;
  ancho: number | null;
}

export interface SizeGuide {
  rows: SizeGuideRow[];
}

/**
 * Qué dibujo y qué explicación corresponde. Zapatillas y accesorios no llevan
 * guía de medidas. Los shorts están dentro de Pantalones: se reconocen por el nombre.
 */
export function garmentKind(
  category: string | null | undefined,
  subcategory: string | null | undefined,
  title?: string | null
): GarmentKind | null {
  if (category === 'sneakers' || subcategory === 'accesorios') return null;
  if (subcategory === 'pantalones') return /\bshorts?\b/i.test(title ?? '') ? 'short' : 'pantalon';
  if (subcategory === 'hoodies') return 'hoodie';
  if (subcategory === 'sweaters') return 'sweater';
  if (subcategory === 'zip-hoodies') return 'zip-hoodie';
  return 'remera';
}

/** Pantalón o short: se miden de la cintura para abajo */
export const isBottom = (kind: GarmentKind) => kind === 'pantalon' || kind === 'short';

/**
 * Cómo dibujar la cintura del pantalón según el nombre: jeans, chinos y cargos
 * con botón y bragueta; joggers y shorts de algodón con elástico. Si el nombre
 * no dice, decide el dibujo (los shorts, elástico).
 */
export function waistStyle(title: string | null | undefined): 'button' | 'elastic' | undefined {
  const t = (title ?? '').toLowerCase();
  if (/\b(jeans?|denim|selvedge|chinos?|cargo|carpenter|work ?pants?)\b/.test(t)) return 'button';
  if (/\b(jogger|sweat ?pants?|sweatpants|track|fleece)\b/.test(t)) return 'elastic';
  return undefined;
}

const TOP_HELP = {
  largo: 'Del punto más alto del hombro hasta el ruedo.',
  ancho: 'De axila a axila, con la prenda apoyada en plano.',
};
const WARM_HELP = {
  largo: 'Del punto más alto del hombro hasta el borde de abajo.',
  ancho: 'De axila a axila, con la prenda apoyada en plano.',
};
const BOTTOM_HELP = {
  largo: 'De la cintura hasta el ruedo, por el costado.',
  ancho: 'La cintura de lado a lado, con la prenda apoyada en plano.',
};

/** Qué mide la línea 1 (largo) y la 2 (ancho) del dibujo */
export const MEASURE_HELP: Record<GarmentKind, { largo: string; ancho: string }> = {
  remera: TOP_HELP,
  hoodie: WARM_HELP,
  sweater: WARM_HELP,
  'zip-hoodie': WARM_HELP,
  pantalon: BOTTOM_HELP,
  short: BOTTOM_HELP,
};

const MAX_CM = 300;

function toCm(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.').trim());
  if (!Number.isFinite(n) || n <= 0 || n > MAX_CM) return null;
  return Math.round(n * 10) / 10;
}

/** Lee lo que viene de la base (o del formulario) y descarta lo que no sirve. */
export function parseSizeGuide(value: unknown): SizeGuide | null {
  const raw = (value as { rows?: unknown } | null)?.rows;
  if (!Array.isArray(raw)) return null;
  const rows: SizeGuideRow[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const size = String((r as SizeGuideRow)?.size ?? '').trim();
    const largo = toCm((r as SizeGuideRow)?.largo);
    const ancho = toCm((r as SizeGuideRow)?.ancho);
    if (!size || (largo === null && ancho === null)) continue;
    const key = size.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ size, largo, ancho });
  }
  return rows.length ? { rows } : null;
}

/** Ordena las filas como los talles del producto (S, M, L… o 30, 32…); los que no están, al final. */
export function orderRows(guide: SizeGuide, sizes: string[]): SizeGuideRow[] {
  const idx = (s: string) => {
    const i = sizes.findIndex((x) => x.trim().toLowerCase() === s.trim().toLowerCase());
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...guide.rows].sort((a, b) => idx(a.size) - idx(b.size));
}

/** La fila de un talle, sin importar mayúsculas ni espacios. */
export function rowFor(guide: SizeGuide | null, size: string | null | undefined): SizeGuideRow | null {
  if (!guide || !size) return null;
  const k = size.trim().toLowerCase();
  return guide.rows.find((r) => r.size.trim().toLowerCase() === k) ?? null;
}

export function formatCm(n: number | null): string {
  if (n === null) return '—';
  return `${String(n).replace('.', ',')} cm`;
}

/** El número solo, para la tabla (la unidad va en el encabezado) */
export function formatNumber(n: number | null): string {
  return n === null ? '—' : String(n).replace('.', ',');
}

// ── Lectura de las medidas escritas en la descripción ─────────────────────────

const NUM = String.raw`(\d{1,3}(?:[.,]\d{1,2})?)`;
// "Medidas Largo x Ancho", "Medidas: largo x anco", "Largo x Ancho"
const HEADER = /^\s*(?:medidas?\s*:?\s*)?(largo|ancho|anco)\s*(?:x|×|por|\/)\s*(largo|ancho|anco)\s*:?\s*$/i;
// "69 cm x 52 cm", "74.5cm x 56", "Talle S: 58 cm x 60 cm"
const PAIR = new RegExp(String.raw`^\s*(?:talle\s+(.+?)\s*[:\-–]\s*)?` + NUM + String.raw`\s*(?:cm)?\s*(?:x|×)\s*` + NUM + String.raw`\s*(?:cm)?\s*\.?\s*$`, 'i');
// "Ancho 46 cm largo: 110 cm" (las dos en la misma línea, con su nombre)
const NAMED = new RegExp(String.raw`(largo|ancho|anco)\s*:?\s*` + NUM + String.raw`\s*(?:cm)?`, 'gi');

function matchSize(label: string | undefined, sizes: string[]): string | null {
  if (!label) return null;
  const k = label.trim().toLowerCase();
  return sizes.find((s) => s.trim().toLowerCase() === k) ?? label.trim();
}

/**
 * Busca las medidas en la descripción. Devuelve la guía (o null si no hay) y la
 * descripción sin esas líneas, para no mostrar lo mismo dos veces.
 * `sizes` son los talles del producto: si hay uno solo y la línea no dice de
 * qué talle es, las medidas son de ese talle.
 */
export function extractFromDescription(
  description: string | null | undefined,
  sizes: string[]
): { guide: SizeGuide | null; cleaned: string } {
  const text = description ?? '';
  const lines = text.split(/\r?\n/);
  const keep: string[] = [];
  const rows: SizeGuideRow[] = [];
  // Orden de las columnas según el encabezado; por defecto "Largo x Ancho"
  let order: ['largo' | 'ancho', 'largo' | 'ancho'] = ['largo', 'ancho'];
  const fallbackSize = sizes.length === 1 ? sizes[0] : sizes.length === 0 ? 'Único' : null;

  for (const line of lines) {
    const header = HEADER.exec(line);
    if (header) {
      const a = header[1].toLowerCase() === 'largo' ? 'largo' : 'ancho';
      order = [a, a === 'largo' ? 'ancho' : 'largo'];
      continue;
    }

    const pair = PAIR.exec(line);
    if (pair) {
      const size = matchSize(pair[1], sizes) ?? fallbackSize;
      if (size) {
        const first = toCm(pair[2]);
        const second = toCm(pair[3]);
        rows.push({
          size,
          largo: order[0] === 'largo' ? first : second,
          ancho: order[0] === 'ancho' ? first : second,
        });
        continue;
      }
    }

    const named = [...line.matchAll(NAMED)];
    // Solo si la línea es eso y nada más (no borrar frases que mencionan "largo" de pasada)
    const rest = line.replace(NAMED, '').replace(/[\s,.;:yY\-–/]+/g, '');
    if (named.length > 0 && rest === '' && fallbackSize) {
      const row: SizeGuideRow = { size: fallbackSize, largo: null, ancho: null };
      for (const m of named) {
        const key = m[1].toLowerCase() === 'largo' ? 'largo' : 'ancho';
        row[key] = toCm(m[2]);
      }
      rows.push(row);
      continue;
    }

    keep.push(line);
  }

  const guide = parseSizeGuide({ rows });
  if (!guide) return { guide: null, cleaned: text };

  const cleaned = keep
    .join('\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { guide, cleaned };
}
