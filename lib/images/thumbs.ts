/**
 * Miniaturas de las fotos de producto.
 *
 * Cada foto se guarda dos veces en el bucket product-images: la original de
 * 1400px (para la ficha) y una copia chica en sm/ con el mismo nombre (para
 * tarjetas, carruseles y categorías). Antes las achicaba el optimizador de
 * imágenes de Vercel, pero el plan gratis trae 5.000 transformaciones por mes
 * y al pasarse respondía 402: las fotos de los productos nuevos no cargaban.
 *
 * Este archivo lo usa también el loader del navegador: no importar sharp acá.
 */
export const THUMB_SIZE = 640;           // lado de la miniatura: tarjeta de a dos en un celular 3x
export const THUMB_QUALITY = 80;
export const THUMB_FOLDER = 'sm';

const PUBLIC_PATH = '/storage/v1/object/public/product-images/';

/** URL de la miniatura, o null si la foto no es del bucket de productos. */
export function thumbUrl(src: string): string | null {
  const i = src.indexOf(PUBLIC_PATH);
  if (i === -1) return null;
  const name = src.slice(i + PUBLIC_PATH.length);
  if (!name || name.includes('/') || name.includes('?')) return null;
  return `${src.slice(0, i + PUBLIC_PATH.length)}${THUMB_FOLDER}/${name}`;
}
