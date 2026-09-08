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

/**
 * Por debajo de este ancho/alto la foto hay que agrandarla tanto para llenar
 * el cuadro que se ve borrosa. No se rechaza (a veces es la única que hay),
 * pero se avisa para que se busque una mejor en la web de origen.
 */
export const MIN_LADO_RECOMENDADO = 800;
export const MIN_LADO_ACEPTABLE = 500;

export interface NormalizedImage {
  buffer: Buffer;
  width: number;
  height: number;
  originalFormat: string;
  originalWidth: number;
  originalHeight: number;
  originalBytes: number;
  bytes: number;
  /** Aviso para el admin si la foto de origen es pobre; null si está bien */
  warning: string | null;
}

/** Explica en criollo por qué una foto va a verse mal, o null si está bien. */
function revisarCalidad(width: number, height: number): string | null {
  const lado = Math.max(width, height);
  if (lado < MIN_LADO_ACEPTABLE) {
    return `La foto es muy chica (${width}×${height}px) y se va a ver borrosa. Buscá una más grande en la web de la marca.`;
  }
  if (lado < MIN_LADO_RECOMENDADO) {
    return `La foto es algo chica (${width}×${height}px). Va a funcionar, pero una de ${MIN_LADO_RECOMENDADO}px o más se ve bastante mejor.`;
  }
  return null;
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

  const ow = meta.width ?? 0;
  const oh = meta.height ?? 0;

  return {
    buffer,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    originalFormat: meta.format ?? 'desconocido',
    originalWidth: ow,
    originalHeight: oh,
    originalBytes: input.length,
    bytes: buffer.length,
    warning: ow && oh ? revisarCalidad(ow, oh) : null,
  };
}
