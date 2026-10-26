import { THUMB_SIZE, thumbUrl } from './thumbs';

/**
 * Loader de next/image: las fotos salen directo de Supabase, sin pasar por el
 * optimizador de Vercel. Hasta 640px de ancho se usa la miniatura (sm/) y por
 * encima la original de 1400px. Lo demás (logo, Instagram) va tal cual.
 */
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  if (width <= THUMB_SIZE) return thumbUrl(src) ?? src;
  return src;
}
