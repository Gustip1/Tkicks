/**
 * Consultas que quedan guardadas en la web (ofertas, talles buscados, dudas y
 * encargos). Antes dependían de que la persona apretara Enviar en WhatsApp; el
 * 68% venía del navegador de Instagram, donde WhatsApp muchas veces no abre.
 *
 * Este archivo no toca la red: valida, normaliza y arma los textos. Lo usan
 * la API, el admin y los tests.
 */

export type LeadKind = 'offer' | 'size_request' | 'question' | 'custom_order';
export type LeadStatus = 'new' | 'answered' | 'discarded';

export interface Lead {
  id: string;
  created_at: string;
  kind: LeadKind;
  status: LeadStatus;
  phone: string;
  name: string | null;
  product_slug: string | null;
  product_title: string | null;
  size: string | null;
  amount: number | null;
  currency: string | null;
  message: string | null;
  page_path: string | null;
  details: Record<string, unknown> | null;
}

export interface LeadInput {
  kind: LeadKind;
  phone: string;
  name?: string | null;
  product_slug?: string | null;
  product_title?: string | null;
  size?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  message?: string | null;
  page_path?: string | null;
}

export const LEAD_KINDS: LeadKind[] = ['offer', 'size_request', 'question', 'custom_order'];

export const LEAD_LABELS: Record<LeadKind, string> = {
  offer: 'Oferta',
  size_request: 'Busca un talle',
  question: 'Consulta',
  custom_order: 'Encargo',
};

const clean = (v: unknown, max: number): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/<[^>]*>/g, '').replace(/\s+\n/g, '\n').trim();
  return s ? s.slice(0, max) : null;
};

/** Solo los dígitos de lo que escribió la persona */
export function phoneDigits(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

/** Un celular creíble: entre 8 y 15 dígitos y no todos iguales */
export function validPhone(raw: string): boolean {
  const d = phoneDigits(raw);
  return d.length >= 8 && d.length <= 15 && !/^(\d)\1+$/.test(d);
}

/**
 * Número listo para wa.me, pensado para celulares argentinos escritos de
 * cualquier forma: "264 480-2994", "0264 15 4802994", "+54 9 264 4802994".
 * Si no se reconoce el formato devuelve los dígitos tal cual.
 */
export function toWhatsAppNumber(raw: string): string {
  let d = phoneDigits(raw);
  if (d.startsWith('549') && d.length === 13) return d;
  if (d.startsWith('54') && d.length === 12) return `549${d.slice(2)}`;
  if (d.startsWith('54') && d.length > 12) d = d.slice(2);
  d = d.replace(/^0+/, '');
  // "15" después de la característica (2 a 4 dígitos): sobra en WhatsApp
  if (d.length === 12) {
    for (const area of [2, 3, 4]) {
      if (d.slice(area, area + 2) === '15') {
        d = d.slice(0, area) + d.slice(area + 2);
        break;
      }
    }
  }
  if (d.startsWith('9') && d.length === 11) d = d.slice(1);
  return d.length === 10 ? `549${d}` : d;
}

export type LeadValidation = { ok: true; lead: Omit<Lead, 'id' | 'created_at' | 'status' | 'details'> } | { ok: false; error: string };

/** Valida y limpia lo que manda el navegador */
export function validateLead(body: unknown): LeadValidation {
  const b = (body ?? {}) as Record<string, unknown>;
  const kind = b.kind as LeadKind;
  if (!LEAD_KINDS.includes(kind)) return { ok: false, error: 'Tipo de consulta inválido' };
  const phone = clean(b.phone, 30) || '';
  if (!validPhone(phone)) return { ok: false, error: 'Revisá el número de WhatsApp' };

  let amount: number | null = null;
  if (b.amount !== null && b.amount !== undefined && b.amount !== '') {
    amount = Number(String(b.amount).replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e10) return { ok: false, error: 'Revisá el monto' };
  }
  if (kind === 'offer' && amount === null) return { ok: false, error: 'Falta el monto de la oferta' };
  const currency = b.currency === 'USD' ? 'USD' : b.currency === 'ARS' ? 'ARS' : null;

  return {
    ok: true,
    lead: {
      kind,
      phone,
      name: clean(b.name, 120),
      product_slug: clean(b.product_slug, 200),
      product_title: clean(b.product_title, 200),
      size: clean(b.size, 40),
      amount,
      currency: amount !== null ? currency || 'ARS' : null,
      message: clean(b.message, 4000),
      page_path: clean(b.page_path, 300),
    },
  };
}

const money = (l: Pick<Lead, 'amount' | 'currency'>) =>
  l.amount === null ? '' : `${l.currency === 'USD' ? 'US$ ' : '$ '}${Number(l.amount).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

/** Una línea que resume qué pidió: "Ofrece $ 150.000 por Jordan 1" */
export function leadSummary(l: Pick<Lead, 'kind' | 'amount' | 'currency' | 'product_title' | 'size'>): string {
  const product = l.product_title || 'un producto';
  switch (l.kind) {
    case 'offer':
      return `Ofrece ${money(l)} por ${product}`;
    case 'size_request':
      return `Busca ${product}${l.size ? ` en talle ${l.size}` : ' en otro talle'}`;
    case 'custom_order':
      return 'Encargo personalizado';
    default:
      return l.product_title ? `Consulta por ${product}${l.size ? ` (talle ${l.size})` : ''}` : 'Consulta general';
  }
}

/** Con qué mensaje le contesta el dueño por WhatsApp */
export function replyText(l: Pick<Lead, 'kind' | 'amount' | 'currency' | 'product_title' | 'size' | 'name'>): string {
  const hi = `Hola${l.name ? ` ${l.name.split(' ')[0]}` : ''}! Te escribo de Tkicks`;
  const product = l.product_title ? `*${l.product_title}*` : 'lo que consultaste';
  switch (l.kind) {
    case 'offer':
      return `${hi} por tu oferta de ${money(l)} por ${product}.`;
    case 'size_request':
      return `${hi}. Nos dejaste que buscás ${product}${l.size ? ` en talle ${l.size}` : ''}.`;
    case 'custom_order':
      return `${hi} por el encargo que nos dejaste en la web.`;
    default:
      return `${hi} por tu consulta${l.product_title ? ` sobre ${product}` : ''}.`;
  }
}

/** Link de WhatsApp al cliente, con la respuesta ya empezada */
export function replyLink(l: Lead): string {
  return `https://wa.me/${toWhatsAppNumber(l.phone)}?text=${encodeURIComponent(replyText(l))}`;
}
