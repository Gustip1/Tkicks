import { describe, expect, it } from 'vitest';
import { checkCoupon, findCoupon } from '@/lib/orders/coupon';
import type { DiscountCode } from '@/types/db';

/** Base de mentira con lo justo del cliente de Supabase que usa lib/orders/coupon.ts */
function fakeDb(tables: Record<string, any[]>) {
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      const result = () => Promise.resolve({ data: rows, error: null });
      const q: any = {
        select: () => q,
        eq: (c: string, v: any) => ((rows = rows.filter((r) => r[c] === v)), q),
        neq: (c: string, v: any) => ((rows = rows.filter((r) => r[c] !== v)), q),
        in: (c: string, vs: any[]) => ((rows = rows.filter((r) => vs.includes(r[c]))), q),
        limit: (n: number) => ((rows = rows.slice(0, n)), result()),
        maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
        then: (ok: any, ko: any) => result().then(ok, ko),
      };
      return q;
    },
  } as any;
}

const coupon = (over: Partial<DiscountCode> = {}): DiscountCode => ({
  id: '1',
  code: 'HOLA10',
  type: 'percent',
  value: 10,
  active: true,
  starts_at: null,
  ends_at: null,
  max_uses: null,
  used_count: 0,
  created_at: '2026-11-01T00:00:00Z',
  ...over,
});

const items = [{ price: 100, quantity: 1, category: 'sneakers', brand: 'nike', onSale: false }];
const ana = { email: 'Ana@Mail.com ', document: '30111222' };

describe('checkCoupon: condiciones del cliente', () => {
  it('sin condiciones de cliente no mira los pedidos', async () => {
    const r = await checkCoupon(fakeDb({}), coupon(), { items, customer: ana });
    expect(r).toMatchObject({ ok: true, discount: 10 });
  });

  it('un uso por cliente: lo frena por email o por documento, y no cuenta los cancelados', async () => {
    const c = coupon({ once_per_customer: true });
    const used = { discount_code: 'HOLA10', status: 'draft', email: 'ana@mail.com', document: '999' };
    expect(await checkCoupon(fakeDb({ orders: [used] }), c, { items, customer: ana })).toEqual({ ok: false, reason: 'Ya usaste este cupón en otra compra' });

    const sameDni = { discount_code: 'HOLA10', status: 'paid', email: 'otro@mail.com', document: '30111222' };
    expect((await checkCoupon(fakeDb({ orders: [sameDni] }), c, { items, customer: ana })).ok).toBe(false);

    const cancelled = { ...used, status: 'cancelled' };
    const otherCode = { ...used, discount_code: 'OTRO' };
    expect((await checkCoupon(fakeDb({ orders: [cancelled, otherCode] }), c, { items, customer: ana })).ok).toBe(true);
  });

  it('primera compra: solo cuentan los pedidos pagados', async () => {
    const c = coupon({ first_purchase_only: true });
    const paid = { discount_code: null, status: 'fulfilled', email: 'ana@mail.com', document: null };
    expect(await checkCoupon(fakeDb({ orders: [paid] }), c, { items, customer: ana })).toEqual({ ok: false, reason: 'Este cupón vale solo para la primera compra' });
    const pending = { ...paid, status: 'draft' };
    expect((await checkCoupon(fakeDb({ orders: [pending] }), c, { items, customer: ana })).ok).toBe(true);
  });

  it('si todavía no cargó sus datos, deja pasar la vista previa', async () => {
    const c = coupon({ once_per_customer: true, first_purchase_only: true });
    const any = { discount_code: 'HOLA10', status: 'paid', email: 'ana@mail.com', document: '30111222' };
    expect((await checkCoupon(fakeDb({ orders: [any] }), c, { items, customer: {} })).ok).toBe(true);
  });

  it('las reglas del carrito van primero y nombran la marca por su nombre', async () => {
    const c = coupon({ applies_brands: ['supreme'] });
    const db = fakeDb({ brands: [{ slug: 'supreme', name: 'Supreme' }] });
    expect(await checkCoupon(db, c, { items, customer: ana })).toEqual({ ok: false, reason: 'Este cupón vale solo para Supreme' });
  });
});

describe('findCoupon', () => {
  it('busca sin importar mayúsculas ni espacios', async () => {
    const db = fakeDb({ discount_codes: [coupon()] });
    expect((await findCoupon(db, ' hola10 '))?.code).toBe('HOLA10');
    expect(await findCoupon(db, 'NOEXISTE')).toBeNull();
  });
});
