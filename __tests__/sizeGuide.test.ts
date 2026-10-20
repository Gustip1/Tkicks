import { describe, it, expect } from 'vitest';
import { extractFromDescription, parseSizeGuide, garmentKind, orderRows, rowFor, formatCm } from '../lib/sizeGuide';

const ORIG = 'Todos nuestros productos son 100% originales.';

describe('extractFromDescription', () => {
  it('lee el formato habitual de un solo talle y limpia la descripción', () => {
    const r = extractFromDescription(`${ORIG}\nMedidas Largo x Ancho \n69 cm x 52 cm `, ['L']);
    expect(r.guide).toEqual({ rows: [{ size: 'L', largo: 69, ancho: 52 }] });
    expect(r.cleaned).toBe(ORIG);
  });

  it('mantiene las notas de calce que no son medidas', () => {
    const r = extractFromDescription(`${ORIG}\nTTS corte estilo Oversized ir al talle\nMedidas Largo x Ancho\n71 cm x 66 cm `, ['XL']);
    expect(r.guide?.rows[0]).toEqual({ size: 'XL', largo: 71, ancho: 66 });
    expect(r.cleaned).toBe(`${ORIG}\nTTS corte estilo Oversized ir al talle`);
  });

  it('acepta decimales con punto o coma y el error de tipeo "Anco"', () => {
    expect(extractFromDescription('Medidas Largo x Anco\n74.5 cm x 56 cm', ['XL']).guide?.rows[0]).toEqual({ size: 'XL', largo: 74.5, ancho: 56 });
    expect(extractFromDescription('Medidas Largo x ancho\n57,5 cm x 69 cm\nFit hombros caidos', ['M']).cleaned).toBe('Fit hombros caidos');
  });

  it('lee varios talles con "Talle X:" y respeta el nombre del talle del producto', () => {
    const r = extractFromDescription(`${ORIG}\nMedidas Largo x ancho \nTalle S: 58 cm x 60 cm\nTalle xl: 72 cm x 75 cm `, ['S', 'XL']);
    expect(r.guide?.rows).toEqual([
      { size: 'S', largo: 58, ancho: 60 },
      { size: 'XL', largo: 72, ancho: 75 },
    ]);
    expect(r.cleaned).toBe(ORIG);
  });

  it('lee "Ancho 46 cm largo: 110 cm" en cualquier orden', () => {
    const r = extractFromDescription(`${ORIG}\nAncho 46 cm largo: 110 cm`, ['34']);
    expect(r.guide?.rows[0]).toEqual({ size: '34', largo: 110, ancho: 46 });
    expect(r.cleaned).toBe(ORIG);
  });

  it('respeta el encabezado "Ancho x Largo"', () => {
    expect(extractFromDescription('Medidas Ancho x Largo\n52 x 69', ['L']).guide?.rows[0]).toEqual({ size: 'L', largo: 69, ancho: 52 });
  });

  it('no toca descripciones sin medidas ni frases que mencionan "largo" de pasada', () => {
    const d = `${ORIG}\nPRECIO INDIVIDUAL\nCorte largo, ideal para layering`;
    const r = extractFromDescription(d, ['M']);
    expect(r.guide).toBeNull();
    expect(r.cleaned).toBe(d);
  });

  it('con varios talles y medidas sin talle, no adivina de qué talle son', () => {
    const r = extractFromDescription('Medidas Largo x Ancho\n70 cm x 55 cm', ['M', 'L']);
    expect(r.guide).toBeNull();
  });
});

describe('parseSizeGuide', () => {
  it('descarta filas vacías, valores imposibles y talles repetidos', () => {
    expect(parseSizeGuide({ rows: [
      { size: 'M', largo: '70', ancho: '54,5' },
      { size: ' m ', largo: 1, ancho: 1 },
      { size: 'L', largo: null, ancho: '' },
      { size: '', largo: 70, ancho: 50 },
      { size: 'XL', largo: 999, ancho: 60 },
    ] })).toEqual({ rows: [{ size: 'M', largo: 70, ancho: 54.5 }, { size: 'XL', largo: null, ancho: 60 }] });
    expect(parseSizeGuide(null)).toBeNull();
    expect(parseSizeGuide({ rows: [] })).toBeNull();
  });
});

describe('ayudas', () => {
  it('elige la maqueta por categoría', () => {
    expect(garmentKind('streetwear', 'remeras')).toBe('top');
    expect(garmentKind('streetwear', 'hoodies')).toBe('sweater');
    expect(garmentKind('streetwear', 'pantalones')).toBe('bottom');
    expect(garmentKind('sneakers', null)).toBeNull();
    expect(garmentKind('streetwear', 'accesorios')).toBeNull();
  });
  it('ordena como los talles del producto y encuentra la fila sin importar mayúsculas', () => {
    const g = { rows: [{ size: 'XL', largo: 72, ancho: 75 }, { size: 'S', largo: 58, ancho: 60 }] };
    expect(orderRows(g, ['S', 'XL']).map((r) => r.size)).toEqual(['S', 'XL']);
    expect(rowFor(g, 'xl')?.largo).toBe(72);
    expect(formatCm(74.5)).toBe('74,5 cm');
  });
});
