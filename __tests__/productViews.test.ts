import { describe, expect, it } from 'vitest';
import { summarizeViews, ViewRow } from '@/lib/productViews';

const NOW = new Date('2026-11-24T12:00:00Z').getTime();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** n personas distintas, todas hace `ago` milisegundos */
const people = (n: number, ago: number, prefix = 'p'): ViewRow[] =>
  Array.from({ length: n }, (_, i) => ({ session_id: `s-${prefix}-${i}`, visitor_id: `${prefix}-${i}`, created_at: new Date(NOW - ago).toISOString() }));

describe('summarizeViews', () => {
  it('no muestra nada con pocas visitas', () => {
    expect(summarizeViews([], NOW)).toBeNull();
    expect(summarizeViews(people(4, 2 * DAY), NOW)).toBeNull();
    // 9 en el mes no alcanzan
    expect(summarizeViews(people(9, 20 * DAY), NOW)).toBeNull();
  });

  it('elige el período más corto que tenga un número que valga', () => {
    expect(summarizeViews(people(12, 3 * HOUR), NOW)).toEqual({ count: 12, period: 'en las últimas 24 horas' });
    // 6 hoy no alcanzan para "24 horas", pero sí para la semana
    expect(summarizeViews(people(6, 3 * HOUR), NOW)).toEqual({ count: 6, period: 'en los últimos 7 días' });
    expect(summarizeViews([...people(3, 2 * DAY, 'a'), ...people(20, 15 * DAY, 'b')], NOW)).toEqual({ count: 23, period: 'en los últimos 30 días' });
  });

  it('cuenta personas, no veces que entraron', () => {
    const same: ViewRow[] = Array.from({ length: 30 }, (_, i) => ({ session_id: `s${i}`, visitor_id: 'una-sola', created_at: new Date(NOW - HOUR).toISOString() }));
    expect(summarizeViews(same, NOW)).toBeNull();
    expect(summarizeViews([...same, ...people(4, HOUR)], NOW)).toEqual({ count: 5, period: 'en los últimos 7 días' });
  });

  it('sin identificador de navegador cuenta por sesión, e ignora fechas rotas o futuras', () => {
    const rows: ViewRow[] = [
      ...Array.from({ length: 5 }, (_, i) => ({ session_id: `s${i}`, visitor_id: null, created_at: new Date(NOW - DAY).toISOString() })),
      { session_id: 'x', created_at: 'no es una fecha' },
      { session_id: 'y', created_at: new Date(NOW + DAY).toISOString() },
      { session_id: 'z', created_at: new Date(NOW - 40 * DAY).toISOString() },
    ];
    expect(summarizeViews(rows, NOW)).toEqual({ count: 5, period: 'en los últimos 7 días' });
  });
});
