import { describe, it, expect } from 'vitest';
import { cartJourney, JourneyVisit, JourneyEvent } from '../lib/analytics/cart';

// Minutos desde las 12:00 del 1/10/2026
const at = (min: number) => new Date(2026, 9, 1, 12, min, 0).toISOString();
const v = (session_id: string, page_path: string, min: number, duration: number | null = null): JourneyVisit => ({
  session_id, page_path, created_at: at(min), exited_at: duration === null ? null : at(min + 1), duration_seconds: duration,
});
const e = (session_id: string, event_name: string, min: number, data: Record<string, unknown> = {}): JourneyEvent => ({
  session_id, event_name, created_at: at(min), event_data: data,
});

describe('cartJourney', () => {
  const visits: JourneyVisit[] = [
    // a: portada y se va
    v('a', '/', 0, 10),
    // b: mira un producto y se va desde la ficha
    v('b', '/', 0), v('b', '/producto/remera-a', 1, 90),
    // c: agrega y se va sin checkout
    v('c', '/producto/remera-a', 0, 200),
    // d: agrega, a los 3 min va al checkout y compra 4 min después
    v('d', '/producto/buzo-b', 0), v('d', '/checkout', 3, 600),
    // e1 (hoy) agrega; e2 (otra pestaña, al día siguiente) va al checkout y no compra
    v('e1', '/producto/remera-a', 0, 60),
    v('e2', '/checkout', 60 * 26, 120),
    // f: consulta por WhatsApp desde la ficha
    v('f', '/producto/buzo-b', 0, 45),
  ];
  const events: JourneyEvent[] = [
    e('c', 'add_to_cart', 0, { slug: 'remera-a', title: 'Remera A', size: 'M', visitor_id: 'pc' }),
    e('d', 'add_to_cart', 0, { slug: 'buzo-b', title: 'Buzo B', size: 'L', visitor_id: 'pd' }),
    e('d', 'checkout_started', 3, { visitor_id: 'pd' }),
    e('d', 'purchase', 7, { visitor_id: 'pd' }),
    e('e1', 'add_to_cart', 0, { slug: 'remera-a', title: 'Remera A', size: 'L', visitor_id: 'pe' }),
    e('e1', 'add_to_cart', 1, { slug: 'remera-a', title: 'Remera A', size: 'L', visitor_id: 'pe' }),
    e('e2', 'checkout_started', 60 * 26, { visitor_id: 'pe' }),
    e('f', 'whatsapp_click', 0, { slug: 'buzo-b', visitor_id: 'pf' }),
  ];
  const j = cartJourney(visits, events);
  const stage = (k: string) => j.exitStages.find((s) => s.key === k)!;

  it('cuenta los productos agregados por persona, con talles y quién siguió al checkout', () => {
    expect(j.products[0]).toEqual({ slug: 'remera-a', title: 'Remera A', adds: 3, people: 2, toCheckout: 1, sizes: ['L', 'M'] });
    expect(j.products[1]).toMatchObject({ slug: 'buzo-b', people: 1, toCheckout: 1, sizes: ['L'] });
  });

  it('mide del carrito al checkout por persona, aunque vuelva en otra pestaña', () => {
    expect(j.timing.people).toBe(3);
    expect(j.timing.toCheckout).toBe(2);
    // 3 min (d) y 26 h (pe): mediana entre los dos
    expect(j.timing.medianToCheckout).toBe((3 * 60 + 26 * 3600) / 2);
    const bucket = (label: string) => j.timing.buckets.find((b) => b.label === label)!.count;
    expect(bucket('1 a 5 minutos')).toBe(1);
    expect(bucket('Más de un día')).toBe(1);
    expect(bucket('No fueron al checkout')).toBe(1);
  });

  it('mide del checkout a la compra', () => {
    expect(j.timing.checkoutPeople).toBe(2);
    expect(j.timing.bought).toBe(1);
    expect(j.timing.medianToBuy).toBe(4 * 60);
  });

  it('pone cada visita en la etapa más avanzada a la que llegó, sin repetir', () => {
    expect(stage('browse').sessions).toBe(1);
    expect(stage('product').sessions).toBe(1);
    expect(stage('cart').sessions).toBe(2); // c y e1
    expect(stage('contacted').sessions).toBe(1);
    expect(stage('checkout').sessions).toBe(1); // e2
    expect(stage('bought').sessions).toBe(1);
    expect(j.exitStages.reduce((a, s) => a + s.sessions, 0)).toBe(j.sessions);
  });

  it('usa la duración más larga de la visita y la mediana por etapa', () => {
    expect(stage('bought').medianSeconds).toBe(600);
    expect(stage('cart').medianSeconds).toBe((200 + 60) / 2);
    expect(stage('browse').medianSeconds).toBe(10);
  });

  it('cuenta la última página antes de irse, con nombre de sección', () => {
    const page = (label: string) => j.exitPages.find((p) => p.label === label)?.sessions;
    expect(page('Ficha de un producto')).toBe(4);
    expect(page('Checkout')).toBe(2);
    expect(page('Inicio')).toBe(1);
  });

  it('no se rompe sin datos', () => {
    const empty = cartJourney([], []);
    expect(empty.products).toEqual([]);
    expect(empty.timing.medianToCheckout).toBeNull();
    expect(empty.sessions).toBe(0);
  });
});
