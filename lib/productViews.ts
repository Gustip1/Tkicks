/**
 * Contador de visitas de la ficha: "38 personas lo vieron en los últimos 7 días".
 *
 * Sale de las visitas reales que guarda la analítica propia (tabla
 * `analytics_visits`, sin bots ni sesiones de admin). Nunca se redondea para
 * arriba ni se rellena: si el número es chico no se muestra nada, porque "2
 * personas lo vieron" juega en contra.
 *
 * Se elige el período más corto que tenga un número que valga la pena (nov
 * 2026: en 7 días la ficha típica tiene 5 personas y la más vista, 72).
 */

export interface ProductViews {
  count: number;
  /** "en las últimas 24 horas", "en los últimos 7 días"… */
  period: string;
}

const DAY = 24 * 60 * 60 * 1000;

const TIERS: { ms: number; min: number; period: string }[] = [
  { ms: DAY, min: 10, period: 'en las últimas 24 horas' },
  { ms: 7 * DAY, min: 5, period: 'en los últimos 7 días' },
  { ms: 30 * DAY, min: 10, period: 'en los últimos 30 días' },
];

/** Hasta cuándo hay que mirar para atrás */
export const VIEWS_WINDOW_MS = 30 * DAY;

export interface ViewRow {
  session_id: string;
  visitor_id?: string | null;
  created_at: string;
}

/**
 * Cuenta personas, no páginas vistas: la misma persona que entra cinco veces
 * cuenta una (por el identificador del navegador; si falta, por la sesión).
 */
export function summarizeViews(rows: ViewRow[], now: number = Date.now()): ProductViews | null {
  for (const tier of TIERS) {
    const people = new Set<string>();
    for (const r of rows) {
      const at = new Date(r.created_at).getTime();
      if (Number.isFinite(at) && now - at <= tier.ms && at <= now) people.add(r.visitor_id || r.session_id);
    }
    if (people.size >= tier.min) return { count: people.size, period: tier.period };
  }
  return null;
}
