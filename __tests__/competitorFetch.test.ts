import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectPlatform, manualSearchUrl, searchSite } from '@/lib/competitorFetch';
import type { CompetitorSite } from '@/lib/competitors';

const site = (over: Partial<CompetitorSite>): CompetitorSite => ({ id: '1', name: 'Tienda', url: 'https://tienda.com.ar', platform: 'shopify', currency: 'ARS', active: true, ...over });
const json = (body: unknown, status = 200) => ({ ok: status < 400, status, headers: new Headers({ 'content-type': 'application/json' }), json: async () => body });

afterEach(() => vi.unstubAllGlobals());

describe('searchSite', () => {
  it('Shopify: busca con la API pública y no se hace pasar por un navegador', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ resources: { results: { products: [{ title: 'Nike Dunk Low Panda', url: '/products/p', price: '280000.00' }] } } }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await searchSite(site({ url: 'https://shopify-uno.com.ar' }), 'Nike Dunk Low "Panda"');
    expect(r.error).toBeNull();
    expect(r.items).toEqual([{ title: 'Nike Dunk Low Panda', url: 'https://shopify-uno.com.ar/products/p', price: 280000, currency: 'ARS', available: null, image: null }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://shopify-uno.com.ar/search/suggest.json?q=nike%20dunk%20low%20panda&resources[type]=product&resources[limit]=6&resources[options][unavailable_products]=last');
    expect(init.headers['User-Agent']).toBe('PriceCheck/1.0');
  });

  it('si no encuentra nada con el título entero, prueba con las primeras palabras', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json([]))
      .mockResolvedValueOnce(json([{ name: 'Jordan 1 Low', permalink: 'https://woo.com.ar/p/j1', prices: { price: '45000000', currency_code: 'ARS', currency_minor_unit: 2 } }]));
    vi.stubGlobal('fetch', fetchMock);
    const r = await searchSite(site({ url: 'https://woo.com.ar', platform: 'woocommerce' }), 'Air Jordan 1 Low Travis Scott Reverse Mocha');
    expect(fetchMock.mock.calls[0][0]).toContain('/wp-json/wc/store/v1/products?search=air%20jordan%201%20low%20travis%20scott');
    expect(fetchMock.mock.calls[1][0]).toContain('search=air%20jordan%201&');
    expect(r.items[0]).toMatchObject({ title: 'Jordan 1 Low', price: 450000 });
  });

  it('guarda la respuesta 10 minutos: no vuelve a consultar la misma web', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ resources: { results: { products: [{ title: 'A', url: '/a', price: '1000' }] } } }));
    vi.stubGlobal('fetch', fetchMock);
    await searchSite(site({ url: 'https://cache.com.ar' }), 'Supreme Box Logo');
    await searchSite(site({ url: 'https://cache.com.ar' }), 'Supreme Box Logo');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('si la web no responde avisa, y una sin lectura automática no se consulta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect((await searchSite(site({ url: 'https://caida.com.ar' }), 'Nike Dunk')).error).toBe('La web no respondió la búsqueda.');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const manual = await searchSite(site({ url: 'https://tn.com.ar', platform: 'manual' }), 'Nike Dunk Low');
    expect(manual).toMatchObject({ items: [], error: null, searchUrl: 'https://tn.com.ar/search?q=nike%20dunk%20low' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('detectPlatform', () => {
  it('reconoce Shopify, WooCommerce o ninguna', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ resources: { results: { products: [] } } })));
    expect(await detectPlatform('https://a.com')).toBe('shopify');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json([])));
    expect(await detectPlatform('https://b.com')).toBe('woocommerce');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ 'content-type': 'text/html' }), json: async () => null }));
    expect(await detectPlatform('https://c.com')).toBe('manual');
  });
  it('arma el link para buscar a mano', () => {
    expect(manualSearchUrl(site({ platform: 'woocommerce', url: 'https://w.com' }), 'Nike Dunk')).toBe('https://w.com/?s=nike%20dunk&post_type=product');
  });
});
