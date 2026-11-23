import { describe, expect, it } from 'vitest';
import { CouponItem, couponStatus, couponSummary, dayEndAR, dayStartAR, evaluateCoupon, paymentGroup, toDateInputAR } from '@/lib/coupons';
import type { DiscountCode } from '@/types/db';

const NOW = new Date('2026-11-22T15:00:00-03:00');

const coupon = (over: Partial<DiscountCode> = {}): Partial<DiscountCode> => ({
  code: 'TEST',
  type: 'percent',
  value: 10,
  active: true,
  starts_at: null,
  ends_at: null,
  max_uses: null,
  used_count: 0,
  ...over,
});

const cart: CouponItem[] = [
  { price: 200, quantity: 1, category: 'sneakers', brand: 'nike', onSale: false },
  { price: 100, quantity: 1, category: 'streetwear', brand: 'scuffers', onSale: true },
];

const run = (c: Partial<DiscountCode>, extra: { paymentMethod?: string | null; items?: CouponItem[] } = {}) =>
  evaluateCoupon(c, { items: extra.items ?? cart, paymentMethod: extra.paymentMethod, now: NOW });

describe('evaluateCoupon', () => {
  it('sin condiciones descuenta sobre todo el carrito, como los cupones de antes', () => {
    expect(run(coupon())).toEqual({ ok: true, discount: 30, eligibleSubtotal: 300, partial: false });
    expect(run(coupon({ type: 'fixed', value: 25 }))).toMatchObject({ ok: true, discount: 25 });
  });

  it('el monto fijo nunca supera lo que se compra', () => {
    expect(run(coupon({ type: 'fixed', value: 500 }))).toMatchObject({ ok: true, discount: 300 });
  });

  it('respeta el tope del porcentaje', () => {
    expect(run(coupon({ value: 50, max_discount: 40 }))).toMatchObject({ ok: true, discount: 40 });
    // el tope no aplica al monto fijo
    expect(run(coupon({ type: 'fixed', value: 60, max_discount: 40 }))).toMatchObject({ ok: true, discount: 60 });
  });

  it('pide la compra mínima y dice cuánto falta', () => {
    const r = run(coupon({ min_subtotal: 400 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('Este cupón vale en compras desde US$ 400. Te faltan US$ 100');
    expect(run(coupon({ min_subtotal: 300 })).ok).toBe(true);
  });

  it('por categoría o marca descuenta solo sobre lo que corresponde', () => {
    expect(run(coupon({ applies_category: 'sneakers' }))).toEqual({ ok: true, discount: 20, eligibleSubtotal: 200, partial: true });
    expect(run(coupon({ applies_brands: ['scuffers'] }))).toMatchObject({ ok: true, discount: 10, partial: true });
    const none = run(coupon({ applies_brands: ['supreme'] }), {});
    expect(none).toEqual({ ok: false, reason: 'Este cupón vale solo para supreme' });
    expect(evaluateCoupon(coupon({ applies_brands: ['supreme'] }), { items: cart, now: NOW }, { supreme: 'Supreme' })).toEqual({
      ok: false,
      reason: 'Este cupón vale solo para Supreme',
    });
  });

  it('la compra mínima se mide sobre los productos a los que aplica', () => {
    const r = run(coupon({ applies_category: 'sneakers', min_subtotal: 250 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('de Sneakers. Te faltan US$ 50');
  });

  it('puede dejar afuera los productos en oferta', () => {
    expect(run(coupon({ exclude_sale: true }))).toEqual({ ok: true, discount: 20, eligibleSubtotal: 200, partial: true });
    const onlySale = run(coupon({ exclude_sale: true }), { items: [cart[1]] });
    expect(onlySale).toEqual({ ok: false, reason: 'Este cupón no aplica a productos en oferta' });
  });

  it('el medio de pago se exige solo cuando ya eligió uno', () => {
    const c = coupon({ payment_scope: 'transfer_cash' });
    expect(run(c).ok).toBe(true);
    expect(run(c, { paymentMethod: 'crypto_transfer' }).ok).toBe(true);
    expect(run(c, { paymentMethod: 'cash' }).ok).toBe(true);
    expect(run(c, { paymentMethod: 'card' })).toEqual({ ok: false, reason: 'Este cupón vale solo pagando con transferencia o efectivo' });
    expect(run(coupon({ payment_scope: 'card' }), { paymentMethod: 'installments_3' }).ok).toBe(true);
  });

  it('rechaza pausado, vencido, agotado y todavía no vigente', () => {
    expect(run(coupon({ active: false }))).toEqual({ ok: false, reason: 'Cupón inactivo' });
    expect(run(coupon({ ends_at: '2026-11-21T23:59:59-03:00' }))).toEqual({ ok: false, reason: 'Cupón vencido' });
    expect(run(coupon({ max_uses: 3, used_count: 3 }))).toEqual({ ok: false, reason: 'Cupón agotado' });
    expect(run(coupon({ starts_at: '2026-12-01T00:00:00-03:00' }))).toEqual({ ok: false, reason: 'Cupón todavía no está vigente' });
  });

  it('redondea a centavos', () => {
    expect(run(coupon({ value: 33 }), { items: [{ price: 99.99, quantity: 1 }] })).toMatchObject({ discount: 33 });
    expect(run(coupon({ value: 15 }), { items: [{ price: 33.33, quantity: 1 }] })).toMatchObject({ discount: 5 });
  });
});

describe('fechas en hora argentina', () => {
  it('un cupón que vence el 30 vale todo el día 30', () => {
    const ends = dayEndAR('2026-11-30');
    expect(couponStatus(coupon({ ends_at: ends }), new Date('2026-11-30T23:00:00-03:00'))).toBe('active');
    expect(couponStatus(coupon({ ends_at: ends }), new Date('2026-12-01T00:00:01-03:00'))).toBe('expired');
    expect(toDateInputAR(ends)).toBe('2026-11-30');
  });

  it('uno que empieza el 25 no vale el 24 a la noche', () => {
    const starts = dayStartAR('2026-11-25');
    expect(couponStatus(coupon({ starts_at: starts }), new Date('2026-11-24T23:30:00-03:00'))).toBe('scheduled');
    expect(couponStatus(coupon({ starts_at: starts }), new Date('2026-11-25T00:00:01-03:00'))).toBe('active');
    expect(toDateInputAR(starts)).toBe('2026-11-25');
  });
});

describe('couponSummary', () => {
  it('arma la frase con todas las condiciones', () => {
    const s = couponSummary(
      coupon({
        value: 15,
        max_discount: 30,
        min_subtotal: 100,
        applies_category: 'streetwear',
        applies_brands: ['scuffers'],
        exclude_sale: true,
        payment_scope: 'transfer_cash',
        once_per_customer: true,
        max_uses: 50,
        ends_at: dayEndAR('2026-11-30'),
      }),
      { scuffers: 'Scuffers' },
      NOW
    );
    expect(s.headline).toBe('15% de descuento, hasta US$ 30');
    expect(s.conditions).toEqual([
      'En compras desde US$ 100',
      'Solo Streetwear de Scuffers',
      'No aplica a productos en oferta',
      'Pagando con transferencia o efectivo',
      'Un uso por cliente',
      'Hasta 50 usos',
      'Hasta el 30/11',
    ]);
  });

  it('un cupón simple no tiene condiciones', () => {
    expect(couponSummary(coupon({ type: 'fixed', value: 20 }), {}, NOW)).toEqual({ headline: 'US$ 20 de descuento', conditions: [] });
  });
});

describe('paymentGroup', () => {
  it('agrupa los medios de pago', () => {
    expect(paymentGroup('cash')).toBe('transfer_cash');
    expect(paymentGroup('crypto_transfer')).toBe('transfer_cash');
    expect(paymentGroup('card')).toBe('card');
    expect(paymentGroup('installments_3')).toBe('card');
    expect(paymentGroup(null)).toBeNull();
  });
});
