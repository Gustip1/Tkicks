import { afterEach, describe, expect, it, vi } from 'vitest';
import { COUPON_TEMPLATE_TEXT, couponDescription, couponMessage, couponTemplateParams, parseCouponPopup } from '@/lib/couponPopup';
import { sendTemplate, whatsappConfig } from '@/lib/whatsapp';
import { dayEndAR } from '@/lib/coupons';

const NOW = new Date('2026-11-23T12:00:00-03:00');
const coupon = {
  code: 'BIENVENIDO10',
  type: 'percent' as const,
  value: 10,
  active: true,
  max_discount: 30,
  min_subtotal: 100,
  once_per_customer: true,
  max_uses: 200,
  ends_at: dayEndAR('2026-12-31'),
};

describe('mensaje del cupón', () => {
  it('describe el cupón en una frase, sin los datos internos', () => {
    expect(couponDescription(coupon, {}, NOW)).toBe('10% de descuento, hasta US$ 30. En compras desde US$ 100. Un uso por cliente. Hasta el 31/12');
  });

  it('las variables de la plantilla van en orden y en un solo renglón', () => {
    const params = couponTemplateParams({ ...coupon, code: ' BIENVENIDO10\n' }, {}, NOW);
    expect(params[0]).toBe('BIENVENIDO10');
    expect(params).toHaveLength(2);
    params.forEach((p) => expect(p).not.toMatch(/\n|\t| {2,}/));
  });

  it('el texto de la plantilla es el mismo mensaje con las variables', () => {
    expect(COUPON_TEMPLATE_TEXT).toContain('{{1}}');
    expect(COUPON_TEMPLATE_TEXT).toContain('{{2}}');
    expect(couponMessage('ABC', 'US$ 10 de descuento')).toBe(
      'Hola, gracias por sumarte a Tkicks. Tu cupón es ABC: US$ 10 de descuento. Lo cargás en el checkout de www.tkicks.com.ar'
    );
  });
});

describe('parseCouponPopup', () => {
  it('apagado y con textos por defecto si no hay nada guardado', () => {
    expect(parseCouponPopup(null)).toEqual({ enabled: false, mode: 'coupon', title: '', text: 'Dejanos tu WhatsApp y te mandamos el cupón.', delaySeconds: 4 });
  });
  it('acota la espera y solo prende con true', () => {
    expect(parseCouponPopup({ enabled: 'si', delaySeconds: 999 })).toMatchObject({ enabled: false, delaySeconds: 60 });
    expect(parseCouponPopup({ enabled: true, delaySeconds: 0, title: '  Hola  ' })).toMatchObject({ enabled: true, delaySeconds: 2, title: 'Hola' });
  });
});

describe('WhatsApp', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('sin las tres variables no hay envío automático', () => {
    vi.stubEnv('WHATSAPP_TOKEN', '');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('WHATSAPP_COUPON_TEMPLATE', 'cupon');
    expect(whatsappConfig()).toBeNull();
    vi.stubEnv('WHATSAPP_TOKEN', 'tok');
    expect(whatsappConfig()).toEqual({ token: 'tok', phoneNumberId: '123', template: 'cupon', lang: 'es_AR' });
  });

  const cfg = { token: 'tok', phoneNumberId: '123', template: 'cupon_bienvenida', lang: 'es_AR' };

  it('manda la plantilla con el formato de la API de Meta', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: 'wamid.1' }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const r = await sendTemplate(cfg, '5492644802994', ['BIENVENIDO10', '10% de descuento']);
    expect(r).toEqual({ ok: true, id: 'wamid.1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/^https:\/\/graph\.facebook\.com\/v\d+\.\d+\/123\/messages$/);
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '+5492644802994',
      type: 'template',
      template: {
        name: 'cupon_bienvenida',
        language: { code: 'es_AR' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: 'BIENVENIDO10' }, { type: 'text', text: '10% de descuento' }] }],
      },
    });
  });

  it('devuelve el motivo cuando Meta rechaza el mensaje, y no rompe si no hay conexión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { message: 'Template name does not exist' } }) }));
    expect(await sendTemplate(cfg, '549264', ['A', 'B'])).toEqual({ ok: false, error: 'Template name does not exist' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await sendTemplate(cfg, '549264', ['A', 'B'])).toEqual({ ok: false, error: 'No se pudo conectar con WhatsApp' });
  });
});

import { validEmail } from '@/lib/couponPopup';

describe('modo lista', () => {
  it('se elige solo con mode: "list"; cualquier otra cosa es el cupón al instante', () => {
    expect(parseCouponPopup({ enabled: true, mode: 'list' }).mode).toBe('list');
    expect(parseCouponPopup({ enabled: true, mode: 'otra' }).mode).toBe('coupon');
    expect(parseCouponPopup({ enabled: true }).mode).toBe('coupon');
  });

  it('valida el email', () => {
    expect(validEmail('gusti@gmail.com')).toBe(true);
    expect(validEmail('  Gusti.P+bf@mail.com.ar ')).toBe(true);
    for (const bad of ['', 'gusti', 'gusti@', 'gusti@gmail', '@gmail.com', 'gus ti@gmail.com']) expect(validEmail(bad)).toBe(false);
  });
});

import { extractHighlights } from '@/lib/couponPopup';

describe('descuentos destacados y espera', () => {
  it('saca los montos del texto del dueño y no repite esa frase', () => {
    expect(extractHighlights('Hay descuentos de 5, 10 y 15 USD. Dejanos tu email y tu WhatsApp y te mandamos el tuyo.')).toEqual({
      highlights: ['US$ 5', 'US$ 10', 'US$ 15'],
      rest: 'Dejanos tu email y tu WhatsApp y te mandamos el tuyo.',
    });
    expect(extractHighlights('Hasta 20% de descuento. Anotate.')).toEqual({ highlights: ['20%'], rest: 'Anotate.' });
  });

  it('sin montos claros no inventa nada, y nunca deja el popup sin texto', () => {
    expect(extractHighlights('Dejanos tu email y te avisamos.')).toEqual({ highlights: [], rest: 'Dejanos tu email y te avisamos.' });
    // números que no son un descuento (sin moneda ni porcentaje)
    expect(extractHighlights('Somos 3 en el showroom. Anotate.').highlights).toEqual([]);
    expect(extractHighlights('Descuentos de 5, 10 y 15 USD')).toEqual({ highlights: ['US$ 5', 'US$ 10', 'US$ 15'], rest: 'Descuentos de 5, 10 y 15 USD' });
  });

  it('la espera vieja por defecto (15 s) pasa a 4 s; otra elegida a mano se respeta', () => {
    expect(parseCouponPopup({ enabled: true, delaySeconds: 15 }).delaySeconds).toBe(4);
    expect(parseCouponPopup({ enabled: true, delaySeconds: 8 }).delaySeconds).toBe(8);
  });
});
