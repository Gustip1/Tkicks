import { describe, it, expect } from 'vitest';
import { diagnose, DiagVisit, DiagEvent } from '../lib/analytics/diagnosis';

const IG = 'Mozilla/5.0 (iPhone) Instagram 300.0';
const v = (session_id: string, page_path: string, t: number, ua: string | null = null): DiagVisit => ({
  session_id, page_path, user_agent: ua, created_at: new Date(2026, 9, 1, 12, 0, t).toISOString(),
});

describe('diagnose', () => {
  const visits: DiagVisit[] = [
    // a: portada y se va enseguida, desde Instagram
    v('a', '/', 0, IG),
    // b: portada, se queda 5 s+ y se va (no es "enseguida")
    v('b', '/', 0),
    // c: portada → catálogo → nada
    v('c', '/', 0), v('c', '/productos', 5),
    // d: catálogo → producto con stock → no hace nada
    v('d', '/productos', 0), v('d', '/producto/remera-a', 5),
    // e: producto con stock → agrega al carrito
    v('e', '/producto/remera-a', 0),
    // f: producto borrado y se va
    v('f', '/producto/vendido-x', 0),
    // g: producto con stock → consulta por WhatsApp
    v('g', '/producto/remera-a', 0),
  ];
  const events: DiagEvent[] = [
    { session_id: 'b', event_name: 'engaged_5s', page_path: '/' },
    { session_id: 'e', event_name: 'add_to_cart', event_data: { slug: 'remera-a' } },
    { session_id: 'g', event_name: 'whatsapp_click', event_data: { slug: 'remera-a' } },
  ];
  const d = diagnose(visits, events, { 'remera-a': 'in_stock' });
  const leak = (k: string) => d.leaks.find((l) => l.key === k)!;

  it('cuenta como "se fue enseguida" solo a quien no llegó a 5 s en la portada', () => {
    expect(leak('quick_exit').lost).toBe(1);
    expect(leak('quick_exit').of).toBe(3);
    expect(leak('quick_exit').detail).toContain('100%');
  });

  it('detecta catálogo sin clicks', () => {
    expect(leak('catalog_no_click').lost).toBe(1); // c
    expect(leak('catalog_no_click').of).toBe(2); // c y d
  });

  it('separa productos borrados de los que tienen stock', () => {
    expect(leak('removed_product').lost).toBe(1); // f
    expect(leak('pdp_no_action').lost).toBe(1); // d (e agregó, g consultó)
    expect(leak('pdp_no_action').of).toBe(3);
  });

  it('el carrito con compra o contacto no es abandono', () => {
    expect(leak('cart_abandon').lost).toBe(1);
    const d2 = diagnose([v('h', '/producto/remera-a', 0)], [
      { session_id: 'h', event_name: 'add_to_cart', event_data: { slug: 'remera-a' } },
      { session_id: 'h', event_name: 'purchase' },
    ], { 'remera-a': 'in_stock' });
    expect(d2.leaks.find((l) => l.key === 'cart_abandon')!.lost).toBe(0);
  });

  it('ordena las fugas de mayor a menor', () => {
    const lost = d.leaks.map((l) => l.lost);
    expect([...lost].sort((a, b) => b - a)).toEqual(lost);
  });
});
