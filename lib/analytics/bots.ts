/**
 * Robots y navegadores automatizados: rastreadores de Google, vistas previas de
 * links (WhatsApp, Facebook), herramientas de prueba. Muchos ejecutan el código
 * de la página, así que sin este filtro registraban "visitas" —el 11% del
 * tráfico en septiembre de 2026— y recorrían todas las fichas, también las de
 * productos borrados o agotados.
 */
export const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|embedly|preview|vercel|python|curl|wget|axios|node-fetch|go-http|phantom|puppeteer|playwright/i;

/** true si quien navega es un robot y no una persona. */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  return !!ua && BOT_UA.test(ua);
}

/** Chequeo en el navegador: el user agent o la marca de navegador automatizado. */
export function isAutomatedBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.webdriver === true || isBotUserAgent(navigator.userAgent);
}
