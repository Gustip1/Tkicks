/**
 * Dirección pública de la tienda: links canónicos, vista previa al compartir y
 * sitemap. Va con www porque la raíz (tkicks.com.ar) solo redirige y le suma un
 * paso a quien entra; el sitemap caía en localhost si faltaba la variable.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tkicks.com.ar').replace(/\/$/, '');
