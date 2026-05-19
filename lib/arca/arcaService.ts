/**
 * arcaService.ts
 * Implementación directa de facturación ARCA (ex-AFIP) usando:
 *   - node-forge  → firma PKCS#7 del TRA para autenticación WSAA
 *   - node-soap   → llamadas SOAP a WSAA y WSFEv1
 *
 * Dos instancias independientes (standard y card) con sus propios
 * certificados y CUIT, manejadas como singletons en memoria.
 */

import fs from 'fs';
import path from 'path';

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'crypto_transfer' | 'installments_3';
export type TipoComprobante = 1 | 6 | 11;  // A | B | C
export type TipoConcepto    = 1 | 2 | 3;   // Productos | Servicios | Mixto

export interface VoucherData {
  ptoVta:     number;
  cbteTipo:   TipoComprobante;
  concepto:   TipoConcepto;
  docNro:     number;
  docTipo:    80 | 96 | 99;
  impTotal:   number;
  impNeto:    number;
  impIVA:     number;
  iva?:       Array<{ Id: number; BaseImp: number; Importe: number }>;
  descripcion?: string;
}

export interface CAEResult {
  CAE:        string;
  CAEFchVto:  string;
  CbteDesde:  number;
  CbteHasta:  number;
  CbteTipo:   number;
  PtoVta:     number;
  Resultado:  string;
}

// ─── Config de entorno ────────────────────────────────────────────────────────

const PRODUCTION = process.env.ARCA_PRODUCTION === 'true';

const WSAA_URL = PRODUCTION
  ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL'
  : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL';

const WSFEV1_URL = PRODUCTION
  ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
  : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL';

// ─── Helpers de certificados ──────────────────────────────────────────────────

function writeCert(filePath: string, b64EnvVar: string): string {
  const b64 = process.env[b64EnvVar];
  if (!b64) throw new Error(`Variable ${b64EnvVar} no configurada en Vercel.`);
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
  }
  return filePath;
}

function getCertPaths(prefix: 'STANDARD' | 'CARD') {
  const p = prefix.toLowerCase();
  return {
    cert: writeCert(`/tmp/arca_${p}.crt`, `ARCA_${prefix}_CERT_B64`),
    key:  writeCert(`/tmp/arca_${p}.key`, `ARCA_${prefix}_KEY_B64`),
    cuit: process.env[`ARCA_${prefix}_CUIT`] ?? '',
  };
}

// ─── WSAA — Autenticación ─────────────────────────────────────────────────────

interface TicketCache { token: string; sign: string; expiry: number }
const ticketCache: Record<string, TicketCache> = {};

async function getTicket(prefix: 'STANDARD' | 'CARD'): Promise<{ token: string; sign: string }> {
  const cached = ticketCache[prefix];
  if (cached && Date.now() < cached.expiry) {
    return { token: cached.token, sign: cached.sign };
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const forge = require('node-forge');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const soap  = require('node-soap');

  const { cert: certPath, key: keyPath } = getCertPaths(prefix);
  const certPem = fs.readFileSync(certPath, 'utf8');
  const keyPem  = fs.readFileSync(keyPath,  'utf8');

  // Crear TRA (Ticket de Requerimiento de Acceso)
  const now     = new Date();
  const from    = new Date(now.getTime() - 60_000);
  const to      = new Date(now.getTime() + 600_000); // 10 min
  const uid     = Math.floor(Date.now() / 1000);

  const tra = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uid}</uniqueId>
    <generationTime>${from.toISOString()}</generationTime>
    <expirationTime>${to.toISOString()}</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>`;

  // Firmar TRA con PKCS#7
  const cert    = forge.pki.certificateFromPem(certPem);
  const key     = forge.pki.privateKeyFromPem(keyPem);
  const p7      = forge.pkcs7.createSignedData();
  p7.content    = forge.util.createBuffer(tra, 'utf8');
  p7.addCertificate(cert);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [],
  });
  p7.sign({ detached: false });
  const cmsDer  = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const cmsB64  = forge.util.encode64(cmsDer);

  // Llamar WSAA
  const wsaaClient = await soap.createClientAsync(WSAA_URL);
  const [result]   = await wsaaClient.loginCmsAsync({ in0: cmsB64 });
  const xml        = result.loginCmsReturn;

  // Parsear respuesta XML
  const tokenMatch = xml.match(/<token>([^<]+)<\/token>/);
  const signMatch  = xml.match(/<sign>([^<]+)<\/sign>/);
  const expiryMatch = xml.match(/<expirationTime>([^<]+)<\/expirationTime>/);

  if (!tokenMatch || !signMatch) throw new Error('WSAA: respuesta inválida');

  const token  = tokenMatch[1];
  const sign   = signMatch[1];
  const expiry = expiryMatch
    ? new Date(expiryMatch[1]).getTime() - 60_000
    : Date.now() + 10 * 60 * 1000;

  ticketCache[prefix] = { token, sign, expiry };
  return { token, sign };
}

// ─── WSFEv1 — Facturación ─────────────────────────────────────────────────────

async function getLastCbteNro(
  prefix: 'STANDARD' | 'CARD',
  ptoVta: number,
  cbteTipo: number,
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const soap = require('node-soap');
  const { token, sign } = await getTicket(prefix);
  const { cuit } = getCertPaths(prefix);

  const client = await soap.createClientAsync(WSFEV1_URL);
  const [res]  = await client.FECompUltimoAutorizadoAsync({
    Auth:     { Token: token, Sign: sign, Cuit: cuit },
    PtoVta:   ptoVta,
    CbteTipo: cbteTipo,
  });
  return Number(res.FECompUltimoAutorizadoResult.CbteNro ?? 0);
}

// ─── API pública ──────────────────────────────────────────────────────────────

export function getTitular(paymentMethod: PaymentMethod): 'standard' | 'card' {
  return paymentMethod === 'installments_3' ? 'card' : 'standard';
}

export async function requestCAE(
  paymentMethod: PaymentMethod,
  data: VoucherData,
): Promise<CAEResult> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const soap = require('node-soap');

  const prefix  = getTitular(paymentMethod) === 'card' ? 'CARD' : 'STANDARD';
  const { token, sign } = await getTicket(prefix);
  const { cuit } = getCertPaths(prefix);

  const lastNro = await getLastCbteNro(prefix, data.ptoVta, data.cbteTipo);
  const nro     = lastNro + 1;

  const today   = new Date();
  const fecha   = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  const client = await soap.createClientAsync(WSFEV1_URL);
  const [res]  = await client.FECAESolicitarAsync({
    Auth: { Token: token, Sign: sign, Cuit: cuit },
    FeCAEReq: {
      FeCabReq: {
        CantReg:  1,
        PtoVta:   data.ptoVta,
        CbteTipo: data.cbteTipo,
      },
      FeDetReq: {
        FECAEDetRequest: {
          Concepto:  data.concepto,
          DocTipo:   data.docTipo,
          DocNro:    data.docNro,
          CbteDesde: nro,
          CbteHasta: nro,
          CbteFch:   fecha,
          ImpTotal:  data.impTotal,
          ImpTotConc: 0,
          ImpNeto:   data.impNeto,
          ImpOpEx:   0,
          ImpIVA:    data.impIVA,
          ImpTrib:   0,
          MonId:     'PES',
          MonCotiz:  1,
          Iva:       data.iva?.length
            ? { AlicIva: data.iva.map(i => ({ Id: i.Id, BaseImp: i.BaseImp, Importe: i.Importe })) }
            : undefined,
        },
      },
    },
  });

  const det = res.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse;
  if (!det || det.Resultado !== 'A') {
    const obs = det?.Observaciones?.Obs?.map((o: { Msg: string }) => o.Msg).join(', ') ?? 'Rechazado por ARCA';
    throw new Error(`ARCA rechazó el comprobante: ${obs}`);
  }

  return {
    CAE:       det.CAE,
    CAEFchVto: det.CAEFchVto,
    CbteDesde: det.CbteDesde,
    CbteHasta: det.CbteHasta,
    CbteTipo:  data.cbteTipo,
    PtoVta:    data.ptoVta,
    Resultado: det.Resultado,
  };
}
