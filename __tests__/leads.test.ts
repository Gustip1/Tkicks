import { describe, it, expect } from 'vitest';
import { leadSummary, replyText, toWhatsAppNumber, validPhone, validateLead } from '../lib/leads';

describe('consultas guardadas en la web', () => {
  it('reconoce celulares argentinos escritos de cualquier forma', () => {
    for (const raw of ['264 480-2994', '0264 15 4802994', '+54 9 264 4802994', '54 264 4802994', '9 264 480 2994', '2644802994']) {
      expect(toWhatsAppNumber(raw)).toBe('5492644802994');
    }
    // Buenos Aires: característica de 2 dígitos
    expect(toWhatsAppNumber('011 15 5555-1234')).toBe('5491155551234');
    // Un número de otro país queda como lo escribieron
    expect(toWhatsAppNumber('+56 9 8765 4321')).toBe('56987654321');
  });

  it('rechaza números que no pueden ser un celular', () => {
    expect(validPhone('264 480 2994')).toBe(true);
    expect(validPhone('12345')).toBe(false);
    expect(validPhone('0000000000')).toBe(false);
    expect(validPhone('')).toBe(false);
  });

  it('valida y limpia lo que manda el navegador', () => {
    const ok = validateLead({ kind: 'offer', phone: ' 264 480 2994 ', amount: '150000', currency: 'ARS', product_title: '<b>Jordan 1</b>', product_slug: 'jordan-1' });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.lead.phone).toBe('264 480 2994');
      expect(ok.lead.amount).toBe(150000);
      expect(ok.lead.product_title).toBe('Jordan 1');
    }
    expect(validateLead({ kind: 'offer', phone: '2644802994' })).toEqual({ ok: false, error: 'Falta el monto de la oferta' });
    expect(validateLead({ kind: 'spam', phone: '2644802994' }).ok).toBe(false);
    expect(validateLead({ kind: 'question', phone: '123' }).ok).toBe(false);
    expect(validateLead(null).ok).toBe(false);
    const q = validateLead({ kind: 'question', phone: '2644802994', message: 'x'.repeat(9000) });
    expect(q.ok && q.lead.message?.length).toBe(4000);
  });

  it('resume cada consulta y arma la respuesta del dueño', () => {
    const offer = { kind: 'offer' as const, amount: 150000, currency: 'ARS', product_title: 'Jordan 1', size: null, name: 'Ana Gómez' };
    expect(leadSummary(offer)).toBe('Ofrece $ 150.000 por Jordan 1');
    expect(replyText(offer)).toBe('Hola Ana! Te escribo de Tkicks por tu oferta de $ 150.000 por *Jordan 1*.');
    expect(leadSummary({ kind: 'size_request', amount: null, currency: null, product_title: 'Hoodie Essentials', size: 'M' })).toBe('Busca Hoodie Essentials en talle M');
    expect(leadSummary({ kind: 'question', amount: null, currency: null, product_title: null, size: null })).toBe('Consulta general');
    expect(leadSummary({ kind: 'offer', amount: 300, currency: 'USD', product_title: 'Dunk Low', size: null })).toBe('Ofrece US$ 300 por Dunk Low');
  });
});
