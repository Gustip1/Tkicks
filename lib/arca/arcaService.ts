/**
 * arcaService.ts
 * Servicio de facturación electrónica ARCA (ex-AFIP).
 *
 * Los certificados se leen desde variables de entorno en base64
 * (ARCA_STANDARD_CERT_B64, etc.) y se escriben en /tmp/ en runtime.
 * Esto es compatible con Vercel (no tiene filesystem persistente).
 */

import fs from 'fs';
import path from 'path';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'crypto_transfer' | 'installments_3';
export type TipoComprobante = 1 | 6 | 11;  // A | B | C
export type TipoConcepto    = 1 | 2 | 3;   // Productos | Servicios | Mixto

export interface VoucherData {
  ptoVta:    number;
  cbteTipo:  TipoComprobante;
  concepto:  TipoConcepto;
  docNro:    number;
  docTipo:   80 | 96 | 99;
  impTotal:  number;
  impNeto:   number;
  impIVA:    number;
  iva?:      Array<{ Id: number; BaseImp: number; Importe: number }>;
  descripcion?: string;
}

export interface CAEResult {
  CAE:        string;
  CAEFchVto:  string;
  CbteDesde:  number;
  CbteHasta:  number;
  CbteTipo:   number;
  FchProceso: string;
  PtoVta:     number;
  Resultado:  string;
}

// ─── Escritura de certificados en /tmp ───────────────────────────────────────

function writeCertIfNeeded(filePath: string, b64EnvVar: string): string {
  const b64 = process.env[b64EnvVar];
  if (!b64) throw new Error(`Variable de entorno ${b64EnvVar} no configurada en Vercel.`);
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
  }
  return filePath;
}

function prepareCerts(prefix: 'STANDARD' | 'CARD') {
  const certPath = `/tmp/arca_${prefix.toLowerCase()}.crt`;
  const keyPath  = `/tmp/arca_${prefix.toLowerCase()}.key`;
  writeCertIfNeeded(certPath, `ARCA_${prefix}_CERT_B64`);
  writeCertIfNeeded(keyPath,  `ARCA_${prefix}_KEY_B64`);
  return { certPath, keyPath };
}

// ─── Instancias lazy de afip.js ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AfipInstance = any;

let _standard: AfipInstance = null;
let _card:     AfipInstance = null;

function loadAfip() {
  // require en runtime — instalar con: npm install afip
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('afip');
}

function getStandardClient(): AfipInstance {
  if (!_standard) {
    const { certPath, keyPath } = prepareCerts('STANDARD');
    const Afip = loadAfip();
    _standard = new Afip({
      CUIT:       Number(process.env.ARCA_STANDARD_CUIT),
      cert:       certPath,
      key:        keyPath,
      production: process.env.ARCA_PRODUCTION === 'true',
      res_folder: '/tmp/arca_cache_standard',
    });
  }
  return _standard;
}

function getCardClient(): AfipInstance {
  if (!_card) {
    const { certPath, keyPath } = prepareCerts('CARD');
    const Afip = loadAfip();
    _card = new Afip({
      CUIT:       Number(process.env.ARCA_CARD_CUIT),
      cert:       certPath,
      key:        keyPath,
      production: process.env.ARCA_PRODUCTION === 'true',
      res_folder: '/tmp/arca_cache_card',
    });
  }
  return _card;
}

// ─── Selección de cliente ─────────────────────────────────────────────────────

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
    CantReg:    1,
    PtoVta:     data.ptoVta,
    CbteTipo:   data.cbteTipo,
    Concepto:   data.concepto,
    DocTipo:    data.docTipo,
    DocNro:     data.docNro,
    CbteDesde:  null,
    CbteHasta:  null,
    CbteFch:    fechaStr,
    ImpTotal:   data.impTotal,
    ImpTotConc: 0,
    ImpNeto:    data.impNeto,
    ImpOpEx:    0,
    ImpIVA:     data.impIVA,
    ImpTrib:    0,
    MonId:      'PES',
    MonCotiz:   1,
    Iva:        data.iva ?? [],
  };

  return getClient(paymentMethod).ElectronicBilling.createNextVoucher(payload);
}
