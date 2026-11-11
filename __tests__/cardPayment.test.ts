import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cardBrandOf,
  cardMultiplier,
  cardTotalArs,
  formatCardNumber,
  luhnValid,
  parseExpiry,
  sameCharge,
} from '../lib/payments/card';
import { chargeCard, paywayPublicConfig, paywayServerConfig, rejectionMessage } from '../lib/payments/payway';

describe('precio con tarjeta (reglas del dueño)', () => {
  it('1 pago sin recargo, con o sin promo', () => {
    expect(cardMultiplier(1, false)).toBe(1);
    expect(cardMultiplier(1, true)).toBe(1);
  });

  it('3 cuotas con 10% de recargo, y sin recargo con la promo activa', () => {
    expect(cardMultiplier(3, false)).toBeCloseTo(1.1);
    expect(cardMultiplier(3, true)).toBe(1);
  });

  it('el total en pesos se redondea al peso', () => {
    // 150 USD × 1.1 × 1452.5 = 239662.5 → 239663
    expect(cardTotalArs(150, 3, false, 1452.5)).toBe(239663);
    expect(cardTotalArs(150, 1, false, 1452.5)).toBe(217875);
    expect(cardTotalArs(150, 3, true, 1452.5)).toBe(217875);
  });

  it('tolera medio punto de diferencia de cotización, no más', () => {
    expect(sameCharge(100_400, 100_000)).toBe(true);
    expect(sameCharge(99_600, 100_000)).toBe(true);
    expect(sameCharge(100_600, 100_000)).toBe(false);
    // Un 10% (promo que cambió) nunca pasa
    expect(sameCharge(110_000, 100_000)).toBe(false);
  });
});

describe('datos de la tarjeta', () => {
  it('reconoce la marca por los primeros dígitos', () => {
    expect(cardBrandOf('4507 9900 0000 4905')).toBe('visa');
    expect(cardBrandOf('5299910010000015')).toBe('mastercard');
    expect(cardBrandOf('2223000048400011')).toBe('mastercard');
    expect(cardBrandOf('373953192351004')).toBe('amex');
    expect(cardBrandOf('5896570000000008')).toBeNull(); // Naranja
    expect(cardBrandOf('')).toBeNull();
  });

  it('agrupa el número como está impreso', () => {
    expect(formatCardNumber('4507990000004905')).toBe('4507 9900 0000 4905');
    expect(formatCardNumber('373953192351004')).toBe('3739 531923 51004');
    expect(formatCardNumber('45079900000049059999')).toBe('4507 9900 0000 4905');
  });

  it('valida el dígito verificador', () => {
    expect(luhnValid('4507990000004905')).toBe(true);
    expect(luhnValid('4507990000004906')).toBe(false);
  });

  it('acepta el vencimiento hasta el último día del mes', () => {
    const now = new Date(2026, 10, 10); // 10/11/2026
    expect(parseExpiry('11/26', now)).toEqual({ month: '11', year: '26' });
    expect(parseExpiry('10/26', now)).toBeNull();
    expect(parseExpiry('13/30', now)).toBeNull();
    expect(parseExpiry('1230', now)).toEqual({ month: '12', year: '30' });
  });
});

describe('Payway', () => {
  const ENV = { ...process.env };
  beforeEach(() => {
    process.env.PAYWAY_PUBLIC_KEY = 'pub';
    process.env.PAYWAY_PRIVATE_KEY = 'priv';
    delete process.env.PAYWAY_ENV;
    delete process.env.PAYWAY_BRANDS;
  });
  afterEach(() => {
    process.env = { ...ENV };
    vi.restoreAllMocks();
  });

  it('sin las dos claves la tarjeta no se ofrece', () => {
    delete process.env.PAYWAY_PRIVATE_KEY;
    expect(paywayPublicConfig()).toBeNull();
    expect(paywayServerConfig()).toBeNull();
  });

  it('usa el sandbox salvo que se pida producción', () => {
    expect(paywayPublicConfig()).toMatchObject({ sandbox: true, apiUrl: 'https://developers.decidir.com/api/v2' });
    process.env.PAYWAY_ENV = 'production';
    expect(paywayPublicConfig()).toMatchObject({ sandbox: false, apiUrl: 'https://live.decidir.com/api/v2' });
    expect(paywayServerConfig()?.apiUrl).toBe('https://ventasonline.payway.com.ar/api/v2');
  });

  it('respeta las marcas habilitadas y nunca expone la clave privada', () => {
    process.env.PAYWAY_BRANDS = 'visa, amex';
    const pub = paywayPublicConfig()!;
    expect(pub.brands).toEqual(['visa', 'amex']);
    expect(JSON.stringify(pub)).not.toContain('priv');
  });

  it('explica el rechazo según el motivo del banco', () => {
    const rejected = (id: number) => ({ status_details: { error: { reason: { id } } } }) as any;
    expect(rejectionMessage(rejected(51), 1)).toMatch(/límite/);
    expect(rejectionMessage(rejected(48), 3)).toMatch(/3 cuotas/);
    expect(rejectionMessage(rejected(91), 1)).toMatch(/no responde/);
    expect(rejectionMessage(rejected(12035), 1)).toMatch(/rechazó/);
  });

  const input = {
    siteTransactionId: 'pedido-1',
    token: 'tok',
    bin: '450799',
    brand: 'visa' as const,
    amountArs: 330000,
    installments: 3 as const,
    customer: { id: '25123456', email: 'a@b.com' },
    description: 'Tkicks 1 producto',
  };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('manda el monto en centavos y las cuotas, y reconoce el aprobado', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ id: 1, site_transaction_id: 'pedido-1', status: 'approved', installments: 3, amount: 33000000 })
    );
    const r = await chargeCard(input);
    expect(r.kind).toBe('approved');
    const sent = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    // 3 cuotas van por Cuota MiPyME 3 (código 13)
    expect(sent).toMatchObject({ amount: 33000000, installments: 13, payment_method_id: 1, currency: 'ARS', site_transaction_id: 'pedido-1' });
  });

  it('un rechazo del banco libera el pedido', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ id: 2, site_transaction_id: 'pedido-1', status: 'rejected', status_details: { error: { reason: { id: 91, description: 'EMISOR FUERA LINEA' } } } }, 402)
    );
    const r = await chargeCard(input);
    expect(r).toMatchObject({ kind: 'rejected', reason: '91 EMISOR FUERA LINEA' });
  });

  it('si se corta la conexión busca el pago antes de decidir', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), { name: 'TimeoutError' }))
      .mockResolvedValueOnce(json({ results: [{ id: 3, site_transaction_id: 'pedido-1', status: 'approved', installments: 3 }] }));
    const r = await chargeCard(input);
    expect(r.kind).toBe('approved');
    expect(String(fetchMock.mock.calls[1][0])).toContain('siteOperationId=pedido-1');
  });

  it('sin respuesta y sin poder confirmar, queda pendiente (no libera el stock)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    const r = await chargeCard(input);
    expect(r.kind).toBe('unknown');
  });

  it('si Payway confirma que no hubo cobro, es un rechazo', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ error_type: 'api_error', message: 'auth-3ds-svc' }, 502))
      .mockResolvedValueOnce(json({ results: [] }));
    const r = await chargeCard(input);
    expect(r.kind).toBe('rejected');
  });

  it('un pedido ya cobrado no se cobra dos veces: se toma el pago existente', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ error_type: 'invalid_request_error', validation_errors: [{ code: 'repeated', param: 'site_transaction_id' }] }, 400))
      .mockResolvedValueOnce(json({ results: [{ id: 4, site_transaction_id: 'pedido-1', status: 'approved', installments: 3 }] }));
    const r = await chargeCard(input);
    expect(r.kind).toBe('approved');
  });

  it('una tarjeta que no coincide con la marca es un rechazo con mensaje claro', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error_type: 'invalid_request_error', validation_errors: [{ code: 'invalid_param', param: 'bin' }] }, 400)
    );
    const r = await chargeCard(input);
    expect(r).toMatchObject({ kind: 'rejected' });
    expect((r as any).message).toMatch(/crédito/);
  });
});

import { canonicalProvince, phoneWithCountry, provinceCode, validPostalCode } from '../lib/payments/card';
import { buildFraudDetection } from '../lib/payments/payway';

describe('facturación y control de fraude', () => {
  it('reconoce provincias escritas a mano y da el código de Cybersource', () => {
    expect(provinceCode('San Juan')).toBe('J');
    expect(provinceCode('san juan ')).toBe('J');
    expect(provinceCode('CABA')).toBe('C');
    expect(provinceCode('Capital Federal')).toBe('C');
    expect(provinceCode('Provincia de Buenos Aires')).toBe('B');
    expect(provinceCode('Cordoba')).toBe('X');
    expect(provinceCode('Entre Rios')).toBe('E');
    expect(provinceCode('Tierra del Fuego, Antártida e Islas')).toBe('V');
    expect(canonicalProvince('neuquen')).toBe('Neuquén');
    expect(provinceCode('Narnia')).toBeNull();
  });

  it('teléfono con el 54 adelante y solo números', () => {
    expect(phoneWithCountry('264 480-2994')).toBe('542644802994');
    expect(phoneWithCountry('0264 4802994')).toBe('542644802994');
    expect(phoneWithCountry('+54 9 264 480 2994')).toBe('5492644802994');
  });

  it('código postal de 4 números o CPA', () => {
    expect(validPostalCode('5400')).toBe(true);
    expect(validPostalCode('J5400ABC')).toBe(true);
    expect(validPostalCode('54')).toBe(false);
  });

  const fraud = {
    deviceId: 'dev-123456',
    pickup: false,
    contact: { firstName: 'Ana', lastName: 'Gómez', email: 'Ana@Mail.com', phone: '264 4000000', document: '25.123.456' },
    billing: { street: 'Av. Libertador 123', postalCode: '5400', city: 'San Juan', province: 'San Juan' },
    shipping: { street: 'Mitre 50', postalCode: 'C1000', city: 'CABA', province: 'CABA' },
    items: [
      { code: 'a', sku: 'a-M', name: 'Remera A', description: 'Remera A talle M', quantity: 2, weightUsd: 100 },
      { code: 'b', sku: 'b-L', name: 'Buzo B', description: 'Buzo B talle L', quantity: 1, weightUsd: 50 },
    ],
  };

  it('arma el bloque Retail con facturación, envío y productos que suman el total', () => {
    const fd = buildFraudDetection(fraud, 1_000_001);
    expect(fd.bill_to).toMatchObject({ state: 'J', country: 'AR', customer_id: '25123456', email: 'ana@mail.com', phone_number: '542644000000' });
    expect(fd.retail_transaction_data.ship_to).toMatchObject({ state: 'C', city: 'CABA', postal_code: 'C1000' });
    expect(fd.dispatch_method).toBe('domicilio');
    expect(fd.device_unique_id).toBe('dev-123456');
    const items = fd.retail_transaction_data.items;
    expect(items.reduce((a, it) => a + it.total_amount, 0)).toBe(1_000_001);
    expect(items[0].total_amount).toBe(666_667);
    expect(items[0].unit_price).toBe(333_334);
  });

  it('retiro en el showroom va como click and collect', () => {
    expect(buildFraudDetection({ ...fraud, pickup: true }, 100).dispatch_method).toBe('click and collect');
  });

  it('el cobro lleva el control de fraude y el código de cuotas configurado', async () => {
    process.env.PAYWAY_PUBLIC_KEY = 'pub';
    process.env.PAYWAY_PRIVATE_KEY = 'priv';
    process.env.PAYWAY_INSTALLMENTS_3 = '3';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 9, site_transaction_id: 'p', status: 'approved', installments: 13 }), { status: 200 })
    );
    await chargeCard({
      siteTransactionId: 'p', token: 't', bin: '450799', brand: 'visa', amountArs: 1000, installments: 3,
      customer: { id: '1', email: 'a@b.com' }, description: 'x', fraud,
    });
    const sent = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(sent.installments).toBe(3);
    expect(sent.fraud_detection.purchase_totals).toEqual({ currency: 'ARS', amount: 100000 });
    delete process.env.PAYWAY_INSTALLMENTS_3;
    process.env.PAYWAY_CYBERSOURCE = 'off';
    fetchMock.mockClear();
    await chargeCard({
      siteTransactionId: 'p', token: 't', bin: '450799', brand: 'visa', amountArs: 1000, installments: 3,
      customer: { id: '1', email: 'a@b.com' }, description: 'x', fraud,
    });
    const sent2 = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(sent2.installments).toBe(13);
    expect(sent2.fraud_detection).toBeUndefined();
    delete process.env.PAYWAY_CYBERSOURCE;
    vi.restoreAllMocks();
  });
});

describe('variables de Vercel', () => {
  it('reconoce producción aunque el valor tenga comillas o espacios', () => {
    process.env.PAYWAY_PUBLIC_KEY = ' "pub" ';
    process.env.PAYWAY_PRIVATE_KEY = 'priv';
    for (const v of ['production', ' production ', '"production"', 'Producción']) {
      process.env.PAYWAY_ENV = v;
      expect(paywayPublicConfig()).toMatchObject({ sandbox: false, publicKey: 'pub' });
    }
    process.env.PAYWAY_ENV = 'sandbox';
    expect(paywayPublicConfig()?.sandbox).toBe(true);
    delete process.env.PAYWAY_ENV;
  });
});

describe('sin PAYWAY_ENV en la web publicada', () => {
  it('apaga la tarjeta en vez de mandar claves reales al sandbox', () => {
    process.env.PAYWAY_PUBLIC_KEY = 'pub';
    process.env.PAYWAY_PRIVATE_KEY = 'priv';
    delete process.env.PAYWAY_ENV;
    process.env.VERCEL_ENV = 'production';
    expect(paywayPublicConfig()).toBeNull();
    expect(paywayServerConfig()).toBeNull();
    process.env.PAYWAY_ENV = 'production';
    expect(paywayPublicConfig()?.sandbox).toBe(false);
    process.env.PAYWAY_ENV = 'sandbox';
    expect(paywayPublicConfig()?.sandbox).toBe(true);
    delete process.env.PAYWAY_ENV;
    delete process.env.VERCEL_ENV;
  });
});
