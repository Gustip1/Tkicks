/**
 * Aviso de cuenta: el popup que se muestra al entrar a la tienda cuando el
 * Instagram está suspendido. Se prende y apaga desde /admin/ajustes
 * (settings.key = 'account_notice'); el texto vive acá para poder ajustarlo
 * en un solo lugar.
 */

export const ACCOUNT_NOTICE_SETTING_KEY = 'account_notice';

/** Se recuerda por pestaña: aceptado una vez, no vuelve a molestar en esa visita. */
export const ACCOUNT_NOTICE_ACK_KEY = 'tkicks_account_notice_ack';

export const TIKTOK_HANDLE = '@tkicks.sj';
export const TIKTOK_URL = 'https://www.tiktok.com/@tkicks.sj';

export const ACCOUNT_NOTICE = {
  badge: 'Información importante',
  title: 'Nuestro Instagram está suspendido temporalmente',
  lead:
    'Nos suspendieron temporalmente la cuenta por un error de detección automática de Instagram con marcas ' +
    'internacionales. Ya presentamos todas las facturas y compras oficiales y el soporte está terminando de ' +
    'procesar la reactivación.',
  body:
    'Estamos haciendo la apelación correspondiente con todas las facturas de compra de los proveedores con los ' +
    'que trabajamos siempre. Cada par y cada prenda que vendemos es 100% original, con su comprobante de compra.',
  stamps: ['Louis Vuitton', 'Kith', 'Nike'],
  stampsCaption: 'Compras oficiales en Miami y Nueva York, con factura',
  tiktokLead: 'Mientras tanto seguinos en TikTok',
  accept: 'Entendido',
} as const;
