/**
 * arcaService.ts
 * Servicio de facturación electrónica ARCA (ex-AFIP).
 *
 * Mantiene DOS instancias independientes de afip.js:
 *   - `standardClient` → titular principal (efectivo / transferencia)
 *   - `cardClient`     → titular tarjeta de crédito
 *
 * Selección automática según método de pago:
 *   getClient('installments_3') → cardClient
 *   getClient('cash' | 'crypto_transfer') → standardClient
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Afip = require('@afipsdk/afip.js');

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'crypto_transfer' | 'installments_3';

export type TipoComprobante =
  | 1   // Factura A
  | 6   // Factura B
  | 11; // Factura C

export type TipoConcepto =
  | 1   // Productos
  | 2   // Servicios
  | 3;  // Productos y Servicios

export interface VoucherData {
  /** Punto de venta (ej. 1) */
  ptoVta: number;
  /** 1=A, 6=B, 11=C */
  cbteTipo: TipoComprobante;
  /** 1=Productos, 2=Servicios, 3=Mixto */
  concepto: TipoConcepto;
  /** CUIT del receptor (si no tiene, usar 0 para consumidor final) */
  docNro: number;
  /** 99=Consumidor Final, 80=CUIT, 96=DNI */
  docTipo: 80 | 96 | 99;
  /** Importe total */
  impTotal: number;
  /** Importe neto gravado (igual a impTotal para monotributistas/exentos) */
  impNeto: number;
  /** Alícuota IVA: 5=21%, 4=10.5%, 3=0%, 2=Exento */
  iva?: Array<{ Id: number; BaseImp: number; Importe: number }>;
  /** IVA total (0 para monotributistas) */
  impIVA: number;
  /** Fecha de comprobante AAAAMMDD */
  cbteDesde?: number;
  cbteHasta?: number;
  /** Descripción (opcional, se guarda en el historial local) */
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

// ─── Instancias (singleton lazy) ─────────────────────────────────────────────

let _standard: ReturnType<typeof Afip> | null = null;
let _card: ReturnType<typeof Afip> | null = null;

function getStandardClient() {
  if (!_standard) {
    _standard = new Afip({
      CUIT: Number(process.env.ARCA_STANDARD_CUIT),
      cert: process.env.ARCA_STANDARD_CERT_PATH ?? './certs/standard.crt',
      key: process.env.ARCA_STANDARD_KEY_PATH ?? './certs/standard.key',
      production: process.env.ARCA_PRODUCTION === 'true',
      // afip.js cachea el Token/Sign automáticamente en res_folder
      res_folder: './certs/cache_standard',
      access_token: '',
    });
  }
  return _standard;
}

function getCardClient() {
  if (!_card) {
    _card = new Afip({
      CUIT: Number(process.env.ARCA_CARD_CUIT),
      cert: process.env.ARCA_CARD_CERT_PATH ?? './certs/card.crt',
      key: process.env.ARCA_CARD_KEY_PATH ?? './certs/card.key',
      production: process.env.ARCA_PRODUCTION === 'true',
      res_folder: './certs/cache_card',
      access_token: '',
    });
  }
  return _card;
}

/**
 * Devuelve el cliente ARCA correcto según el método de pago.
 * tarjeta → cardClient, resto → standardClient.
 */
export function getClient(paymentMethod: PaymentMethod) {
  return paymentMethod === 'installments_3' ? getCardClient() : getStandardClient();
}

export function getTitular(paymentMethod: PaymentMethod): 'standard' | 'card' {
  return paymentMethod === 'installments_3' ? 'card' : 'standard';
}

// ─── API pública del servicio ─────────────────────────────────────────────────

/** Verifica que los servidores de ARCA estén operativos. */
export async function checkServerStatus(paymentMethod: PaymentMethod) {
  const client = getClient(paymentMethod);
  return client.ElectronicBilling.getServerStatus();
}

/** Último número de comprobante autorizado para un punto de venta y tipo. */
export async function getLastVoucherNumber(
  paymentMethod: PaymentMethod,
  ptoVta: number,
  cbteTipo: TipoComprobante,
): Promise<number> {
  const client = getClient(paymentMethod);
  return client.ElectronicBilling.getLastVoucher(ptoVta, cbteTipo);
}

/**
 * Solicita el CAE a ARCA y devuelve el resultado.
 * Usa `createNextVoucher` que auto-incrementa el número de comprobante.
 */
export async function requestCAE(
  paymentMethod: PaymentMethod,
  data: VoucherData,
): Promise<CAEResult> {
  const client = getClient(paymentMethod);

  const today = new Date();
  const fechaStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  const voucherPayload = {
    CantReg: 1,
    PtoVta: data.ptoVta,
    CbteTipo: data.cbteTipo,
    Concepto: data.concepto,
    DocTipo: data.docTipo,
    DocNro: data.docNro,
    CbteDesde: data.cbteDesde ?? null,  // null → auto-next
    CbteHasta: data.cbteHasta ?? null,
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

  return client.ElectronicBilling.createNextVoucher(voucherPayload);
}
