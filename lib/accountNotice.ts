/**
 * Aviso de cuenta: el popup que se muestra al entrar a la tienda mientras el
 * Instagram principal está caído. Se prende y apaga desde /admin/ajustes
 * (settings.key = 'account_notice'); el texto vive acá para poder ajustarlo
 * en un solo lugar.
 *
 * Es lo primero que ve el visitante, así que va corto: qué pasó, a qué cuenta
 * seguirnos y listo.
 */

export const ACCOUNT_NOTICE_SETTING_KEY = 'account_notice';

/** Se recuerda por pestaña: aceptado una vez, no vuelve a molestar en esa visita. */
export const ACCOUNT_NOTICE_ACK_KEY = 'tkicks_account_notice_ack';

/** Cuenta de respaldo, la que hay que seguir mientras recuperamos la principal. */
export const BACKUP_HANDLE = '@tkicks.gp';
export const BACKUP_URL = 'https://www.instagram.com/tkicks.gp';

export const ACCOUNT_NOTICE = {
  badge: 'Cuenta de respaldo',
  title: 'Seguinos en @tkicks.gp',
  message:
    'Por ahora no tenemos acceso a nuestra cuenta principal. Mientras la recuperamos, ' +
    'seguinos en la secundaria así no te perdés nada.',
  follow: 'Seguir @tkicks.gp',
  accept: 'Entrar a la web',
} as const;
