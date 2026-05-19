/**
 * arcaService.ts
 * Servicio de facturación electrónica ARCA (ex-AFIP).
 *
 * DOS instancias independientes de afip.js:
 *   - standard → titular principal (efectivo / transferencia)
 *   - card     → titular tarjeta de crédito
 *
 * El require() de afip.js se hace en runtime (dentro de las funciones),
 * no en top-level, para evitar que webpack lo intente bundlear en build time.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'crypto_transfer' | 'installments_3';

export type TipoComprobante = 1 | 6 | 11; // A | B | C

export type TipoConcepto = 1 | 2 | 3; // Productos | Servicios | Mixto

export interface VoucherData {
  ptoVta: number;
  cbteTipo: TipoComprobante;
  concepto: TipoConcepto;
  docNro: number;
  docTipo: 80 | 96 | 99;
  impTotal: number;
  impNeto: number;
  iva?: Array<{ Id: number; BaseImp: number; Importe: number }>;
  impIVA: number;
  descripcion?: string;
}

export interface CAEResult {
  CAE: string;
  CAEFchVto: string;
  CbteDesde: number;
  CbteHasta: number;
  CbteTipo: number;
  FchProceso: string;
  PtoVta: number;
  Resultado: string;
}

// ─── Carga lazy de afip.js ────────────────────────────────────────────────────
// Se hace en runtime, no en import time, para que webpack no lo bundlee.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AfipInstance = any;

let _standard: AfipInstance = null;
let _card: AfipInstance = null;

function loadAfip() {
  // Dynamic require en runtime — nunca en build time
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@afipsdk/afip.js');
}

function getStandardClient(): AfipInstance {
  if (!_standard) {
    const Afip = loadAfip();
    _standard = new Afip({
      CUIT: Number(process.env.ARCA_STANDARD_CUIT),
      cert: process.env.ARCA_STANDARD_CERT_PATH ?? './certs/standard.crt',
      key: process.env.ARCA_STANDARD_KEY_PATH ?? './certs/standard.key',
      production: process.env.ARCA_PRODUCTION === 'true',
      res_folder: './certs/cache_standard',
    });
  }
  return _standard;
}

function getCardClient(): AfipInstance {
  if (!_card) {
    const Afip = loadAfip();
    _card = new Afip({
      CUIT: Number(process.env.ARCA_CARD_CUIT),
      cert: process.env.ARCA_CARD_CERT_PATH ?? './certs/card.crt',
      key: process.env.ARCA_CARD_KEY_PATH ?? './certs/card.key',
      production: process.env.ARCA_PRODUCTION === 'true',
      res_folder: './certs/cache_card',
    });
  }
  return _card;
}

export function getClient(paymentMethod: PaymentMethod): AfipInstance {
  return paymentMethod === 'installments_3' ? getCardClient() : getStandardClient();
}

export function getTitular(paymentMethod: PaymentMethod): 'standard' | 'card' {
  return paymentMethod === 'installments_3' ? 'card' : 'standard';
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function checkServerStatus(paymentMethod: PaymentMethod) {
  return getClient(paymentMethod).ElectronicBilling.getServerStatus();
}

export async function getLastVoucherNumber(
  paymentMethod: PaymentMethod,
  ptoVta: number,
  cbteTipo: TipoComprobante,
): Promise<number> {
  return getClient(paymentMethod).ElectronicBilling.getLastVoucher(ptoVta, cbteTipo);
}

export async function requestCAE(
  paymentMethod: PaymentMethod,
  data: VoucherData,
): Promise<CAEResult> {
  const today = new Date();
  const fechaStr =
    `${today.getFullYear()}` +
    `${String(today.getMonth() + 1).padStart(2, '0')}` +
    `${String(today.getDate()).padStart(2, '0')}`;

  const payload = {
    CantReg: 1,
    PtoVta: data.ptoVta,
    CbteTipo: data.cbteTipo,
    Concepto: data.concepto,
    DocTipo: data.docTipo,
    DocNro: data.docNro,
    CbteDesde: null,
    CbteHasta: null,
    CbteFch: fechaStr,
    ImpTotal: data.impTotal,
    ImpTotConc: 0,
    ImpNeto: data.impNeto,
    ImpOpEx: 0,
    ImpIVA: data.impIVA,
    ImpTrib: 0,
    MonId: 'PES',
    MonCotiz: 1,
    Iva: data.iva ?? [],
  };

  return getClient(paymentMethod).ElectronicBilling.createNextVoucher(payload);
}
