/**
 * Ventas que entran por la web, para el admin: el dashboard las lista y la
 * campanita del encabezado avisa las nuevas (pedido del dueño, nov 2026: "si
 * no me notifica no me entero de una venta con tarjeta").
 *
 * "Vista" se guarda en el navegador del admin: es una comodidad de cada
 * dispositivo, no un dato del negocio.
 */

export interface WebSale {
  id: string;
  order_number: string | null;
  created_at: string;
  status: 'draft' | 'paid' | 'fulfilled' | 'cancelled';
  payment_method: string | null;
  payment_status: string | null;
  /** En dólares */
  total: number | null;
  first_name: string | null;
  last_name: string | null;
  payment_details: {
    installments?: number;
    amount_ars?: number;
    card_brand?: string | null;
    last_four?: string | null;
    status?: string;
  } | null;
}

export const SALE_COLUMNS =
  'id, order_number, created_at, status, payment_method, payment_status, total, first_name, last_name, payment_details';

export type Tone = 'green' | 'yellow' | 'gray' | 'red' | 'blue';

const ars = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export function saleRef(s: WebSale): string {
  return s.order_number || `#${s.id.slice(0, 8)}`;
}

export function customerName(s: WebSale): string {
  return [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Sin nombre';
}

/** Cómo pagó: "Tarjeta · 3 cuotas · Visa •••• 4905", "Transferencia", "Efectivo" */
export function methodLabel(s: WebSale): string {
  const d = s.payment_details;
  switch (s.payment_method) {
    case 'card': {
      const n = d?.installments ?? 1;
      const card = [d?.card_brand, d?.last_four ? `•••• ${d.last_four}` : null].filter(Boolean).join(' ');
      return ['Tarjeta', n > 1 ? `${n} cuotas` : '1 pago', card].filter(Boolean).join(' · ');
    }
    case 'crypto_transfer':
    case 'bank_transfer':
      return 'Transferencia / cripto';
    case 'cash':
      return 'Efectivo al retirar';
    case 'installments_3':
      return 'Tarjeta por link de WhatsApp';
    default:
      return s.payment_method || '—';
  }
}

/** Monto: lo cobrado en pesos si es tarjeta; si no, el total en dólares */
export function amountLabel(s: WebSale): string {
  const arsAmount = s.payment_details?.amount_ars;
  if (s.payment_method === 'card' && typeof arsAmount === 'number') return ars(arsAmount);
  return `US$ ${Number(s.total || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
}

/** En qué está el pago */
export function saleState(s: WebSale): { label: string; tone: Tone } {
  if (s.status === 'cancelled') return { label: 'Cancelado', tone: 'red' };
  if (s.status === 'fulfilled') return { label: 'Entregado', tone: 'blue' };
  if (s.payment_method === 'card') {
    if (s.status === 'paid') return { label: 'Cobrada', tone: 'green' };
    if (s.payment_details?.status === 'review') return { label: 'En revisión', tone: 'yellow' };
    return { label: 'Cobro sin confirmar', tone: 'yellow' };
  }
  if (s.status === 'paid' || s.payment_status === 'validated') return { label: 'Pagado', tone: 'green' };
  if (s.payment_method === 'cash') return { label: 'Paga al retirar', tone: 'gray' };
  return { label: 'Esperando el pago', tone: 'yellow' };
}

/** Pagos con tarjeta que hay que revisar a mano (Payway no confirmó o está en revisión) */
export function needsReview(s: WebSale): boolean {
  if (s.payment_method !== 'card' || s.status !== 'draft') return false;
  // "processing" de hace menos de 2 minutos es un cobro en curso
  const old = Date.now() - new Date(s.created_at).getTime() > 2 * 60 * 1000;
  return s.payment_details?.status === 'review' || s.payment_details?.status === 'unknown' || old;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  if (h < 48) return 'ayer';
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

/** Título del aviso: "Nueva venta con tarjeta" / "Nuevo pedido por transferencia" */
export function alertTitle(s: WebSale): string {
  if (s.payment_method === 'card') return s.status === 'paid' ? 'Nueva venta con tarjeta' : 'Pago con tarjeta para revisar';
  if (s.payment_method === 'cash') return 'Nuevo pedido para pagar en efectivo';
  return 'Nuevo pedido por transferencia';
}

// ── Qué ya vio el admin (en este dispositivo) ──

const SEEN_KEY = 'tk-admin-ventas-vistas';
export const SEEN_EVENT = 'tk-admin-ventas-vistas';
/** La primera vez se muestran como nuevas las de los últimos 3 días */
const FIRST_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export function readSeen(): string {
  try {
    const v = localStorage.getItem(SEEN_KEY);
    if (v && !Number.isNaN(Date.parse(v))) return v;
  } catch {
    /* sin almacenamiento (ventana privada): se usa el valor por defecto */
  }
  return new Date(Date.now() - FIRST_WINDOW_MS).toISOString();
}

export function markSeen(at = new Date().toISOString()) {
  try {
    localStorage.setItem(SEEN_KEY, at);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  window.dispatchEvent(new CustomEvent(SEEN_EVENT, { detail: at }));
}

export const TONE_CLASSES: Record<Tone, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  gray: 'bg-gray-100 text-gray-700',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
};
