import { BillingAddress, CardBrand, CardInstallments, phoneWithCountry, provinceCode } from './card';

/**
 * Payway (ex Decidir), solo del lado del servidor.
 *
 * El pago es en dos pasos:
 * 1. El navegador manda los datos de la tarjeta directo a Payway con la clave
 *    pública (decidir.js) y recibe un token de un solo uso. La tarjeta nunca
 *    pasa por nuestro servidor.
 * 2. El servidor cobra ese token con la clave privada (POST /payments).
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 * - PAYWAY_PUBLIC_KEY y PAYWAY_PRIVATE_KEY: las da Payway. Sin las dos, el
 *   checkout sigue con el link de pago por WhatsApp de antes.
 * - PAYWAY_ENV: "production" para cobrar de verdad; "sandbox" para probar. Sin
 *   la variable, en la web publicada la tarjeta queda apagada (ver mode()).
 * - PAYWAY_BRANDS (opcional): marcas habilitadas, por defecto "visa,mastercard,amex".
 * - PAYWAY_MASTERCARD_ID (opcional): código de Mastercard en tu sitio, por defecto 104.
 * - PAYWAY_INSTALLMENTS_3 (opcional): lo que se manda a Payway cuando el cliente
 *   elige 3 cuotas, por defecto 3. Algunos planes promocionales usan otro código.
 * - PAYWAY_CYBERSOURCE=off (opcional): apaga el control de fraude. El sitio de
 *   Tkicks lo tiene activo (nov 2026), así que por defecto va prendido.
 *
 * Formato verificado contra el sandbox (nov 2026): el monto va en centavos, un
 * site_transaction_id ya aprobado no se puede volver a cobrar ("repeated"), y
 * GET /payments?siteOperationId=… encuentra el pago por nuestro número.
 */

const API = {
  sandbox: { server: 'https://developers.decidir.com/api/v2', browser: 'https://developers.decidir.com/api/v2' },
  // Mismo backend (misma versión en /healthcheck): el navegador usa el dominio
  // que documenta el SDK de JavaScript y el servidor el del SDK de Node
  production: { server: 'https://ventasonline.payway.com.ar/api/v2', browser: 'https://live.decidir.com/api/v2' },
};

/** Script oficial del SDK de JavaScript (README de payway-ar/sdk-javascript-ventaonline) */
export const DECIDIR_SCRIPT = 'https://live.decidir.com/static/v2.6.4/decidir.js';

const ALL_BRANDS: CardBrand[] = ['visa', 'mastercard', 'amex'];

/** Tolera espacios y comillas pegadas al valor al cargarlo en Vercel ("production") */
function env(name: string): string {
  return (process.env[name] ?? '').trim().replace(/^["']+|["']+$/g, '').trim();
}

type Mode = 'production' | 'sandbox';

/**
 * Producción o sandbox según PAYWAY_ENV. Sin la variable, en la web publicada
 * (VERCEL_ENV=production) no se adivina: claves reales contra el sandbox fallan
 * y el cliente vería un error, así que la tarjeta se apaga y queda el link por
 * WhatsApp (nov 2026, primer deploy con claves reales sin PAYWAY_ENV).
 */
function mode(): Mode | null {
  const v = env('PAYWAY_ENV').toLowerCase();
  if (/^(production|produccion|producción|prod)$/.test(v)) return 'production';
  if (/^(sandbox|prueba|test)$/.test(v)) return 'sandbox';
  return process.env.VERCEL_ENV === 'production' ? null : 'sandbox';
}

function isProduction(): boolean {
  return mode() === 'production';
}

function enabledBrands(): CardBrand[] {
  const raw = env('PAYWAY_BRANDS');
  if (!raw) return ALL_BRANDS;
  const list = raw.toLowerCase().split(',').map((s) => s.trim());
  return ALL_BRANDS.filter((b) => list.includes(b));
}

function cybersourceOn(): boolean {
  return env('PAYWAY_CYBERSOURCE').toLowerCase() !== 'off';
}

export interface PaywayPublicConfig {
  publicKey: string;
  apiUrl: string;
  scriptUrl: string;
  brands: CardBrand[];
  sandbox: boolean;
  /** Huella del dispositivo para el control de fraude (decidir.js la arma sola) */
  cybersource: boolean;
}

/** Lo que necesita el navegador para crear el token. null = tarjeta no habilitada */
export function paywayPublicConfig(): PaywayPublicConfig | null {
  const publicKey = env('PAYWAY_PUBLIC_KEY');
  if (!publicKey || !env('PAYWAY_PRIVATE_KEY') || !mode()) return null;
  const brands = enabledBrands();
  if (!brands.length) return null;
  return {
    publicKey,
    apiUrl: (isProduction() ? API.production : API.sandbox).browser,
    scriptUrl: DECIDIR_SCRIPT,
    brands,
    sandbox: !isProduction(),
    // El sandbox no tiene Cybersource: ahí decidir.js pide su configuración, recibe
    // un 404 y falla. La huella solo se arma en producción.
    cybersource: cybersourceOn() && isProduction(),
  };
}

interface ServerConfig {
  privateKey: string;
  apiUrl: string;
  brands: CardBrand[];
  methodIds: Record<CardBrand, number>;
  /** Código de cuotas que se manda a Payway por cada opción del checkout */
  installmentsCode: Record<CardInstallments, number>;
  cybersource: boolean;
  sandbox: boolean;
}

export function paywayServerConfig(): ServerConfig | null {
  const privateKey = env('PAYWAY_PRIVATE_KEY');
  if (!privateKey || !env('PAYWAY_PUBLIC_KEY') || !mode()) return null;
  const brands = enabledBrands();
  if (!brands.length) return null;
  const mastercard = Number(env('PAYWAY_MASTERCARD_ID')) || 104;
  return {
    privateKey,
    apiUrl: (isProduction() ? API.production : API.sandbox).server,
    brands,
    // Códigos de medio de pago de Payway: Visa 1, American Express 65,
    // Mastercard 104 (en algunos sitios viejos, 15)
    methodIds: { visa: 1, mastercard, amex: 65 },
    installmentsCode: { 1: 1, 3: Number(env('PAYWAY_INSTALLMENTS_3')) || 3 },
    cybersource: cybersourceOn(),
    sandbox: !isProduction(),
  };
}

export interface PaywayPayment {
  id: number;
  site_transaction_id: string;
  payment_method_id: number;
  card_brand: string | null;
  amount: number;
  currency: string;
  status: string;
  status_details?: {
    ticket?: string | null;
    card_authorization_code?: string | null;
    error?: { type?: string; reason?: { id?: number; description?: string } } | null;
  } | null;
  bin?: string | null;
  installments: number;
  date?: string;
  /** Resultado del control de fraude (Cybersource), si el sitio lo tiene */
  fraud_detection?: { status?: { decision?: string; reason_code?: number; description?: string } | null } | null;
}

export interface ChargeInput {
  /** Nuestro identificador del pedido: Payway no deja cobrarlo dos veces */
  siteTransactionId: string;
  token: string;
  bin: string;
  brand: CardBrand;
  /** En pesos, ya redondeado */
  amountArs: number;
  installments: CardInstallments;
  customer: { id: string; email: string };
  description: string;
  /** Datos para el control de fraude (Cybersource, vertical Retail) */
  fraud?: FraudInput;
}

export interface FraudInput {
  deviceId: string | null;
  pickup: boolean;
  contact: { firstName: string; lastName: string; email: string; phone: string; document: string };
  billing: BillingAddress;
  /** Dirección de envío; al retirar en el showroom, la de facturación */
  shipping: BillingAddress;
  items: { code: string; sku: string; name: string; description: string; quantity: number; weightUsd: number }[];
}

function csAddress(a: BillingAddress, c: FraudInput['contact']) {
  return {
    city: a.city.trim(),
    country: 'AR',
    email: c.email.trim().toLowerCase(),
    first_name: c.firstName.trim(),
    last_name: c.lastName.trim() || c.firstName.trim(),
    phone_number: phoneWithCountry(c.phone),
    postal_code: a.postalCode.replace(/\s/g, '').toUpperCase(),
    state: provinceCode(a.province) ?? '',
    street1: a.street.trim().slice(0, 60),
  };
}

/**
 * Bloque fraud_detection de Payway (vertical Retail), con los campos que piden
 * los SDK oficiales. Los montos van en centavos; el total se reparte entre los
 * productos según su precio, así la suma da exactamente lo cobrado.
 */
export function buildFraudDetection(f: FraudInput, amountCents: number) {
  const totalWeight = f.items.reduce((acc, it) => acc + it.weightUsd, 0) || 1;
  let assigned = 0;
  const items = f.items.map((it, i) => {
    const total =
      i === f.items.length - 1 ? amountCents - assigned : Math.round((amountCents * it.weightUsd) / totalWeight);
    assigned += total;
    return {
      code: it.code.slice(0, 255),
      description: it.description.slice(0, 255),
      name: it.name.slice(0, 255),
      sku: it.sku.slice(0, 255),
      total_amount: total,
      quantity: it.quantity,
      unit_price: Math.round(total / it.quantity),
    };
  });
  const dispatch = f.pickup ? 'click and collect' : 'domicilio';
  const doc = f.contact.document.replace(/\D/g, '');
  return {
    send_to_cs: true,
    channel: 'Web',
    dispatch_method: dispatch,
    ...(f.deviceId ? { device_unique_id: f.deviceId } : {}),
    bill_to: { ...csAddress(f.billing, f.contact), customer_id: doc || 'invitado' },
    purchase_totals: { currency: 'ARS', amount: amountCents },
    customer_in_site: {
      days_in_site: 0,
      is_guest: true,
      num_of_transactions: 0,
      cellphone_number: phoneWithCountry(f.contact.phone),
    },
    retail_transaction_data: {
      ship_to: csAddress(f.shipping, f.contact),
      dispatch_method: dispatch,
      items,
    },
  };
}

export type ChargeResult =
  /** Cobrado */
  | { kind: 'approved'; payment: PaywayPayment }
  /** Lo está revisando el control de fraude: no está cobrado ni rechazado todavía */
  | { kind: 'review'; payment: PaywayPayment }
  /** Seguro que no se cobró: se puede liberar el stock */
  | { kind: 'rejected'; payment: PaywayPayment | null; message: string; reason: string }
  /** No se sabe (se cortó la conexión con Payway): no liberar nada */
  | { kind: 'unknown'; reason: string };

const GENERIC_REJECTION = 'El banco rechazó el pago. Probá con otra tarjeta o elegí otro medio de pago.';

/**
 * Mensaje para el cliente según el motivo que devuelve el banco. Solo los
 * motivos más comunes; el resto, el mensaje general.
 */
export function rejectionMessage(payment: PaywayPayment | null, installments: CardInstallments): string {
  const reasonId = payment?.status_details?.error?.reason?.id;
  switch (reasonId) {
    case 51:
    case 61:
    case 65:
      return 'La tarjeta no tiene límite suficiente para esta compra. Probá con otra tarjeta.';
    case 54:
    case 49:
      return 'La tarjeta está vencida o el vencimiento no coincide. Revisalo y volvé a intentar.';
    case 45:
    case 48:
    case 77:
      return installments === 3
        ? 'Esta tarjeta no permite pagar en 3 cuotas. Probá en 1 pago o con otra tarjeta.'
        : GENERIC_REJECTION;
    case 91:
    case 96:
      return 'El banco de la tarjeta no responde en este momento. Probá en unos minutos o con otra tarjeta.';
    default:
      return GENERIC_REJECTION;
  }
}

function reasonOf(payment: PaywayPayment | null): string {
  const r = payment?.status_details?.error?.reason;
  return r ? `${r.id ?? ''} ${r.description ?? ''}`.trim() : payment?.status ?? 'sin detalle';
}

function interpret(payment: PaywayPayment, installments: CardInstallments): ChargeResult {
  const status = (payment.status || '').toLowerCase();
  if (status === 'approved') return { kind: 'approved', payment };
  if (status === 'review' || status === 'pre_approved') return { kind: 'review', payment };
  return { kind: 'rejected', payment, message: rejectionMessage(payment, installments), reason: reasonOf(payment) };
}

/**
 * Busca el pago por nuestro identificador. null = Payway confirma que no hay
 * ninguno; undefined = no se pudo preguntar.
 */
export async function findPayment(siteTransactionId: string): Promise<PaywayPayment | null | undefined> {
  const cfg = paywayServerConfig();
  if (!cfg) return undefined;
  try {
    const res = await fetch(`${cfg.apiUrl}/payments?siteOperationId=${encodeURIComponent(siteTransactionId)}`, {
      headers: { apikey: cfg.privateKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    const results: PaywayPayment[] = Array.isArray(data?.results) ? data.results : [];
    const mine = results.filter((p) => p.site_transaction_id === siteTransactionId);
    // Si hay varios intentos, manda el aprobado
    return mine.find((p) => p.status === 'approved') ?? mine[0] ?? null;
  } catch {
    return undefined;
  }
}

async function settleByLookup(input: ChargeInput, why: string): Promise<ChargeResult> {
  const found = await findPayment(input.siteTransactionId);
  if (found) return interpret(found, input.installments);
  if (found === null) {
    return { kind: 'rejected', payment: null, message: GENERIC_REJECTION, reason: why };
  }
  return { kind: 'unknown', reason: why };
}

export async function chargeCard(input: ChargeInput): Promise<ChargeResult> {
  const cfg = paywayServerConfig();
  if (!cfg) return { kind: 'rejected', payment: null, message: GENERIC_REJECTION, reason: 'payway sin configurar' };

  const body = {
    site_transaction_id: input.siteTransactionId,
    token: input.token,
    customer: input.customer,
    payment_method_id: cfg.methodIds[input.brand],
    bin: input.bin,
    // Payway recibe el monto en centavos
    amount: Math.round(input.amountArs * 100),
    currency: 'ARS',
    installments: cfg.installmentsCode[input.installments],
    description: input.description.slice(0, 50),
    payment_type: 'single',
    sub_payments: [],
    ...(cfg.cybersource && input.fraud
      ? { fraud_detection: buildFraudDetection(input.fraud, Math.round(input.amountArs * 100)) }
      : {}),
  };

  let res: Response;
  try {
    res = await fetch(`${cfg.apiUrl}/payments`, {
      method: 'POST',
      headers: { apikey: cfg.privateKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });
  } catch (err: any) {
    // Se cortó o tardó demasiado: el banco pudo haberlo cobrado igual
    return settleByLookup(input, `sin respuesta de Payway: ${err?.name || err}`);
  }

  const data = await res.json().catch(() => null);

  if (data && typeof data.status === 'string' && typeof data.id === 'number') {
    return interpret(data as PaywayPayment, input.installments);
  }

  const validation: { code?: string; param?: string }[] = Array.isArray(data?.validation_errors)
    ? data.validation_errors
    : [];

  // Ese pedido ya se cobró antes (por ejemplo, un reintento): se busca ese pago
  if (validation.some((v) => v.code === 'repeated' && v.param === 'site_transaction_id')) {
    return settleByLookup(input, 'site_transaction_id repetido');
  }

  // Datos inválidos: Payway no procesó nada
  if (data?.error_type === 'invalid_request_error' || res.status === 400 || res.status === 402) {
    const params = validation.map((v) => v.param).filter(Boolean).join(', ');
    const message = /bin|payment_method_id/.test(params)
      ? 'No pudimos usar esa tarjeta. Revisá que sea de crédito y probá de nuevo, o usá otra.'
      : /token/.test(params)
        ? 'Los datos de la tarjeta vencieron. Volvé a tocar Pagar.'
        : GENERIC_REJECTION;
    return { kind: 'rejected', payment: null, message, reason: `${data?.error_type ?? res.status}: ${params}` };
  }

  // Error del lado de Payway (5xx, api_error): se confirma si quedó algo cobrado
  return settleByLookup(input, `${res.status} ${data?.error_type ?? ''} ${data?.message ?? ''}`.trim());
}

/** Lo que se guarda del pago en el pedido (nunca datos de la tarjeta salvo marca y últimos 4) */
export function paymentSummary(payment: PaywayPayment | null) {
  if (!payment) return null;
  return {
    payment_id: payment.id,
    status: payment.status,
    card_brand: payment.card_brand,
    ticket: payment.status_details?.ticket ?? null,
    authorization_code: payment.status_details?.card_authorization_code || null,
    reason: payment.status_details?.error?.reason?.description ?? null,
    fraud_decision: payment.fraud_detection?.status?.decision ?? null,
    date: payment.date ?? null,
  };
}
