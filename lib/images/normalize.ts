import sharp from 'sharp';

/**
 * Normaliza cualquier foto de producto a un único formato y tamaño.
 *
 * Las fotos se descargan de webs distintas y llegaban tal cual: convivían JPG,
 * PNG y WEBP, solo el 41% eran cuadradas (había desde 720x1080 hasta 553x322),
 * el peso llegaba a 3 MB y algunas venían de 380px de ancho. Resultado: en la
 * grilla cada tarjeta se veía distinta y las chicas salían borrosas.
 *
 * Qué hace con cada imagen:
 *  - la encaja en un lienzo cuadrado sin recortar (nunca deforma el producto),
 *    rellenando con blanco para que combine con el fondo del catálogo;
 *  - la lleva a un tamaño fijo, ampliando las chicas y achicando las enormes;
 *  - la convierte a WebP, que pesa bastante menos con la misma calidad;
 *  - respeta la orientación EXIF, así las fotos de celular no salen giradas.
 */
export const IMAGE_SIZE = 1400;          // lado del cuadrado final, en píxeles
export const IMAGE_QUALITY = 82;         // calidad WebP: buen equilibrio peso/nitidez
export const IMAGE_BACKGROUND = { r: 255, g: 255, b: 255, alpha: 1 };

export interface NormalizedImage {
  buffer: Buffer;
  width: number;
  height: number;
  originalFormat: string;
  originalBytes: number;
  bytes: number;
}

export async function normalizeProductImage(input: Buffer): Promise<NormalizedImage> {
  const meta = await sharp(input).metadata();

  const buffer = await sharp(input)
    .rotate() // aplica la orientación EXIF antes de redimensionar
    .resize(IMAGE_SIZE, IMAGE_SIZE, {
      fit: 'contain',              // entra entera: no recorta ni deforma
      background: IMAGE_BACKGROUND,
      withoutEnlargement: false,   // las chicas también se llevan al tamaño estándar
    })
    .flatten({ background: IMAGE_BACKGROUND }) // PNG transparente → fondo blanco
    .webp({ quality: IMAGE_QUALITY, effort: 4 })
    .toBuffer();

  return {
    buffer,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    originalFormat: meta.format ?? 'desconocido',
    originalBytes: input.length,
    bytes: buffer.length,
  };
}
