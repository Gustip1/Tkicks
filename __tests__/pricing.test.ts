import { describe, expect, it } from 'vitest';
import { analyzeMargin, analyzeMarket, effectivePrice, marketSearchLinks, pct, priceForMargin, usdText } from '@/lib/pricing';

describe('effectivePrice', () => {
  it('usa la rebaja solo si es válida', () => {
    expect(effectivePrice(200, '150')).toBe(150);
    expect(effectivePrice(200, 150)).toBe(150);
    expect(effectivePrice(200, '')).toBe(200);
    expect(effectivePrice(200, null)).toBe(200);
    expect(effectivePrice(200, '250')).toBe(200); // mayor al de lista: no es rebaja
    expect(effectivePrice(200, '0')).toBe(200);
  });
});

describe('analyzeMargin', () => {
  it('calcula ganancia, margen y recargo sobre el costo', () => {
    expect(analyzeMargin(200, 150)).toEqual({ price: 200, cost: 150, profit: 50, margin: 0.25, markup: 50 / 150, level: 'ok' });
  });
  it('clasifica el margen', () => {
    expect(analyzeMargin(100, 120)?.level).toBe('loss');
    expect(analyzeMargin(100, 90)?.level).toBe('low');
    expect(analyzeMargin(100, 80)?.level).toBe('ok');
    expect(analyzeMargin(100, 60)?.level).toBe('high');
  });
  it('sin precio o sin costo no hay análisis', () => {
    expect(analyzeMargin(0, 50)).toBeNull();
    expect(analyzeMargin(100, null)).toBeNull();
    expect(analyzeMargin(100, 0)).toBeNull();
  });
});

describe('priceForMargin', () => {
  it('da el precio para ganar el margen pedido, redondeado para arriba', () => {
    expect(priceForMargin(150, 0.25)).toBe(200);
    expect(priceForMargin(100, 0.3)).toBe(142.86);
  });
});

describe('analyzeMarket', () => {
  it('dice si está más barato, igual o más caro que el mercado', () => {
    expect(analyzeMarket(180, 200)).toMatchObject({ position: 'cheaper', diff: -0.1 });
    expect(analyzeMarket(205, 200)?.position).toBe('aligned');
    expect(analyzeMarket(195, 200)?.position).toBe('aligned');
    expect(analyzeMarket(240, 200)).toMatchObject({ position: 'pricier', diff: 0.2 });
  });
  it('con costo, dice cuánto ganaría al precio de mercado', () => {
    expect(analyzeMarket(180, 200, 150)?.atMarket).toMatchObject({ profit: 50, margin: 0.25 });
    expect(analyzeMarket(180, 200)?.atMarket).toBeNull();
  });
  it('sin precio de mercado no hay análisis', () => {
    expect(analyzeMarket(180, null)).toBeNull();
    expect(analyzeMarket(180, 0)).toBeNull();
  });
});

describe('textos', () => {
  it('porcentajes y dólares', () => {
    expect(pct(0.25)).toBe('25%');
    expect(pct(-0.104)).toBe('10%');
    expect(pct(0.085)).toBe('8,5%');
    expect(usdText(120)).toBe('US$ 120');
    expect(usdText(99.5)).toBe('US$ 99,50');
    expect(usdText(-20)).toBe('-US$ 20');
  });
  it('arma las búsquedas del mercado', () => {
    const links = marketSearchLinks('Supreme "Box Logo" Hoodie');
    expect(links.map((l) => l.label)).toEqual(['StockX', 'GOAT', 'MercadoLibre', 'Google']);
    expect(links[0].href).toBe('https://stockx.com/search?s=Supreme%20Box%20Logo%20Hoodie');
    expect(links[2].href).toBe('https://listado.mercadolibre.com.ar/supreme-box-logo-hoodie');
    expect(marketSearchLinks('   ')).toEqual([]);
  });
});
