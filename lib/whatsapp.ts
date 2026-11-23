/**
 * Envío de mensajes por la API oficial de WhatsApp (Cloud API de Meta).
 *
 * A alguien que no escribió primero solo se le puede mandar una plantilla
 * aprobada por Meta: por eso el texto vive en Meta y acá van las variables.
 *
 * Se configura con variables de entorno (en Vercel). Sin ellas no hay envío
 * automático y quien llama resuelve de otra forma (el popup muestra el cupón
 * en pantalla):
 *   WHATSAPP_TOKEN            token de acceso permanente
 *   WHATSAPP_PHONE_NUMBER_ID  identificador del número en Meta (no es el teléfono)
 *   WHATSAPP_COUPON_TEMPLATE  nombre de la plantilla del cupón
 *   WHATSAPP_TEMPLATE_LANG    idioma de la plantilla (por defecto es_AR)
 */

export interface WhatsAppConfig {
  token: string;
  phoneNumberId: string;
  template: string;
  lang: string;
}

export function whatsappConfig(): WhatsAppConfig | null {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const template = process.env.WHATSAPP_COUPON_TEMPLATE?.trim();
  if (!token || !phoneNumberId || !template) return null;
  return { token, phoneNumberId, template, lang: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || 'es_AR' };
}

export type WhatsAppResult = { ok: true; id: string | null } | { ok: false; error: string };

const GRAPH_VERSION = 'v27.0';

/**
 * Manda la plantilla con sus variables de texto, en orden ({{1}}, {{2}}…).
 * `to`: número internacional sin "+", por ejemplo 5492644802994.
 *
 * Que devuelva ok significa que WhatsApp aceptó el pedido, no que el mensaje
 * ya llegó.
 */
export async function sendTemplate(cfg: WhatsAppConfig, to: string, params: string[]): Promise<WhatsAppResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(cfg.phoneNumberId)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: `+${to.replace(/\D/g, '')}`,
        type: 'template',
        template: {
          name: cfg.template,
          language: { code: cfg.lang },
          components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
        },
      }),
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok) {
      // El motivo que da Meta (plantilla sin aprobar, número inválido, token vencido…)
      const reason = typeof data?.error?.message === 'string' ? data.error.message : `Respuesta ${res.status}`;
      return { ok: false, error: reason.slice(0, 300) };
    }
    return { ok: true, id: data?.messages?.[0]?.id ?? null };
  } catch (e) {
    return { ok: false, error: controller.signal.aborted ? 'WhatsApp no respondió a tiempo' : 'No se pudo conectar con WhatsApp' };
  } finally {
    clearTimeout(timer);
  }
}
