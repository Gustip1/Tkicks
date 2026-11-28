import { describe, expect, it } from 'vitest';
import {
  normalizeSiteUrl,
  parseShopifySuggest,
  parseWooProducts,
  searchQuery,
  similarity,
  sameProduct,
  summarizeCompetition,
  toUsd,
  tokens,
} from '@/lib/competitors';

describe('normalizeSiteUrl', () => {
  it('se queda con el dominio, en https', () => {
    expect(normalizeSiteUrl('www.Tienda.com.ar/productos?x=1')).toBe('https://www.tienda.com.ar');
    expect(normalizeSiteUrl('http://shop.example.com')).toBe('https://shop.example.com');
  });
  it('rechaza lo que no es una web pública', () => {
    for (const bad of ['', 'localhost:3000', 'http://192.168.0.1', 'https://intranet', 'ftp://x.com', 'https://algo.local', 'http://[::1]']) {
      expect(normalizeSiteUrl(bad)).toBeNull();
    }
  });
});

describe('búsqueda y parecido', () => {
  it('limpia el título', () => {
    expect(tokens('Supreme "Box Logo" Hooded Sweatshirt®')).toEqual(['supreme', 'box', 'logo', 'hooded', 'sweatshirt']);
    expect(searchQuery('Nike Dunk Low "Panda" de hombre talle 42 original', 4)).toBe('nike dunk low panda');
  });
  it('mide qué parte del producto propio aparece en el otro', () => {
    expect(similarity('Nike Dunk Low Panda', 'Zapatillas Nike Dunk Low Retro "Panda" White Black')).toBe(1);
    expect(similarity('Nike Dunk Low Panda', 'Nike Dunk High')).toBe(0.5);
    expect(similarity('Nike Dunk Low Panda', 'Adidas Samba')).toBe(0);
  });
});

describe('Shopify', () => {
  const json = {
    resources: {
      results: {
        products: [
          { title: 'Nike Dunk Low Panda', url: '/products/dunk-panda?_pos=1&_psq=dunk', price: '289999.00', price_min: '279999.00', available: true, image: 'https://cdn.shopify.com/a.jpg' },
          { title: 'Sin precio', url: '/products/x', price: null },
          { title: 'Nike Dunk Low Grey', url: '/products/grey', price: 310000, available: false, featured_image: { url: 'https://cdn.shopify.com/b.jpg' } },
        ],
      },
    },
  };
  it('lee título, link limpio, precio mínimo, disponibilidad e imagen', () => {
    expect(parseShopifySuggest(json, 'https://tienda.com.ar', 'ARS')).toEqual([
      { title: 'Nike Dunk Low Panda', url: 'https://tienda.com.ar/products/dunk-panda', price: 279999, currency: 'ARS', available: true, image: 'https://cdn.shopify.com/a.jpg' },
      { title: 'Nike Dunk Low Grey', url: 'https://tienda.com.ar/products/grey', price: 310000, currency: 'ARS', available: false, image: 'https://cdn.shopify.com/b.jpg' },
    ]);
  });
  it('una respuesta que no es de Shopify no da resultados', () => {
    expect(parseShopifySuggest({ hola: 1 }, 'https://x.com', 'ARS')).toEqual([]);
    expect(parseShopifySuggest(null, 'https://x.com', 'ARS')).toEqual([]);
  });
});

describe('WooCommerce', () => {
  it('pasa el precio de unidades mínimas a pesos y limpia el nombre', () => {
    const json = [
      { name: 'Jordan 1 Low &amp; Travis', permalink: 'https://w.com.ar/producto/j1/', is_in_stock: true, images: [{ src: 'https://w.com.ar/i.jpg' }], prices: { price: '45000000', currency_code: 'ARS', currency_minor_unit: 2 } },
      { name: 'En dólares', permalink: 'https://w.com.ar/p/usd', prices: { price: '25000', currency_code: 'USD', currency_minor_unit: 2 } },
      { name: 'En euros', permalink: 'https://w.com.ar/p/eur', prices: { price: '100', currency_code: 'EUR', currency_minor_unit: 2 } },
    ];
    expect(parseWooProducts(json, 'https://w.com.ar')).toEqual([
      { title: 'Jordan 1 Low & Travis', url: 'https://w.com.ar/producto/j1/', price: 450000, currency: 'ARS', available: true, image: 'https://w.com.ar/i.jpg' },
      { title: 'En dólares', url: 'https://w.com.ar/p/usd', price: 250, currency: 'USD', available: null, image: null },
    ]);
    expect(parseWooProducts({ code: 'rest_no_route' }, 'https://w.com.ar')).toEqual([]);
  });
});

describe('comparación', () => {
  it('pasa a dólares con el dólar de la tienda', () => {
    expect(toUsd(300000, 'ARS', 1500)).toBe(200);
    expect(toUsd(200, 'USD', 1500)).toBe(200);
    expect(toUsd(300000, 'ARS', 0)).toBeNull();
  });
  it('resume contra el promedio y el más barato', () => {
    expect(summarizeCompetition(180, [200, 220, 150])).toEqual({ count: 3, min: 150, avg: 190, diffVsAvg: (180 - 190) / 190, diffVsMin: 0.2, cheaperThanMe: 1 });
    expect(summarizeCompetition(180, [])).toBeNull();
    expect(summarizeCompetition(0, [100])).toBeNull();
  });
});

describe('sameProduct', () => {
  it('acepta el mismo producto aunque el título tenga palabras de más', () => {
    expect(sameProduct('Nike Dunk Low Panda', 'Zapatillas Nike Dunk Low Retro "Panda" White Black')).toBe(true);
    expect(sameProduct('Supreme Box Logo Hooded Sweatshirt', 'Supreme Box Logo Hooded Sweatshirt FW24 Black')).toBe(true);
  });
  it('descarta otra caña, talles de niño o mujer y otro número de modelo', () => {
    expect(sameProduct('Nike Dunk Low Panda', 'Nike Dunk High Panda')).toBe(false);
    expect(sameProduct('Nike Dunk Low Panda', 'Nike Dunk Low Panda GS')).toBe(false);
    expect(sameProduct('Nike Dunk Low Panda', 'Nike Dunk Low Panda WMNS')).toBe(false);
    expect(sameProduct('Air Jordan 1 Low Travis Scott Mocha', 'Air Jordan 4 Low Travis Scott Mocha')).toBe(false);
    expect(sameProduct('Nike Dunk Low Panda', 'Adidas Samba')).toBe(false);
  });
});
