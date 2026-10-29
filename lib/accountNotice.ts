/**
 * Aviso de cuenta: el popup que se muestra al entrar a la tienda para invitar
 * a seguir el Instagram oficial. Se prende y apaga desde /admin/ajustes
 * (settings.key = 'account_notice'); el texto vive acá para poder ajustarlo
 * en un solo lugar.
 *
 * Es lo primero que ve el visitante, así que va corto: cuál es la cuenta,
 * que es la oficial, y a seguirla.
 */

export const ACCOUNT_NOTICE_SETTING_KEY = 'account_notice';

/** Se recuerda por pestaña: aceptado una vez, no vuelve a molestar en esa visita. */
export const ACCOUNT_NOTICE_ACK_KEY = 'tkicks_account_notice_ack';

/**
 * Instagram oficial. Arrancó como cuenta de respaldo cuando se perdió el acceso
 * a @tkicks.sj (oct 2026) y quedó como la definitiva.
 */
export const INSTAGRAM_HANDLE = '@tkicks.gp';
export const INSTAGRAM_URL = 'https://www.instagram.com/tkicks.gp';

export const ACCOUNT_NOTICE = {
  badge: 'Cuenta oficial',
  title: 'Ahora somos @tkicks.gp',
  message:
    'Es nuestra cuenta oficial de ahora en adelante. Seguinos para no perderte ' +
    'los nuevos ingresos y los drops.',
  follow: 'Seguir @tkicks.gp',
  accept: 'Entrar a la web',
} as const;
