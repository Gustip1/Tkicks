import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import PrintButton from './PrintButton';

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function fmt2(n: number) { return String(n).padStart(2, '0'); }
function fmtFecha(iso: string) {
  const d = new Date(iso);
  return `${fmt2(d.getDate())}/${fmt2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function fmtCaeVto(s: string) {
  // YYYYMMDD → DD/MM/YYYY
  return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
}
function fmtCuit(s: string) {
  return s.replace(/(\d{2})(\d{8})(\d)/, '$1-$2-$3');
}
function fmtMonto(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TIPO_LABEL: Record<number, string> = { 1: 'A', 6: 'B', 11: 'C' };
const DOC_LABEL: Record<number, string>  = { 80: 'CUIT', 96: 'DNI', 99: '' };

export default async function FacturaPrintPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: f } = await sb()
    .from('facturas')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!f) {
    return <div style={{ padding: 40, fontFamily: 'Arial' }}>Factura no encontrada.</div>;
  }

  const cuitEmisor = f.titular_emisor === 'card'
    ? (process.env.ARCA_CARD_CUIT ?? '')
    : (process.env.ARCA_STANDARD_CUIT ?? '');

  const tipoLetra  = TIPO_LABEL[f.cbte_tipo] ?? '?';
  const ptoVtaFmt  = String(f.pto_vta).padStart(5, '0');
  const nroCbteFmt = String(f.cbte_nro).padStart(8, '0');

  // QR ARCA (RG 4291)
  const qrPayload = {
    ver: 1,
    fecha: f.fecha_emision.slice(0, 10),
    cuit: Number(cuitEmisor),
    ptoVta: f.pto_vta,
    tipoCmp: f.cbte_tipo,
    nroCmp: f.cbte_nro,
    importe: f.imp_total,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: f.doc_tipo,
    nroDocRec: Number(f.doc_nro),
    tipoCodAut: 'E',
    codAut: Number(f.cae),
  };
  const qrUrl     = `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(qrPayload)).toString('base64')}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 130, margin: 1 });

  const receptorLinea = f.doc_tipo === 99
    ? 'Consumidor Final'
    : `${DOC_LABEL[f.doc_tipo]}: ${f.doc_nro}`;

  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; background: #fff; }
    .page { width: 190mm; margin: 0 auto; padding: 10mm 0; }

    /* Cabecera tripartita */
    .cab { display: grid; grid-template-columns: 1fr 52px 1fr; border: 1.5px solid #000; }
    .cab-iz, .cab-der { padding: 10px 14px; }
    .cab-cen {
      border-left: 1.5px solid #000; border-right: 1.5px solid #000;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 6px 4px;
    }
    .tipo-letra { font-size: 40px; font-weight: 900; line-height: 1; }
    .tipo-cod   { font-size: 9px; text-align: center; margin-top: 2px; }
    .empresa    { font-size: 15px; font-weight: 700; margin-bottom: 5px; }
    .doc-title  { font-size: 13px; font-weight: 700; margin-bottom: 6px; }
    .nro-cbte   { font-size: 13px; margin-bottom: 3px; }

    /* Secciones */
    .sec { border: 1px solid #000; padding: 7px 12px; margin-top: 6px; }
    .sec-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .sec-lbl { font-weight: 700; margin-right: 4px; }

    /* Tabla detalle */
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #eee; border: 1px solid #000; padding: 5px 8px; text-align: left; font-size: 11px; }
    td { border: 1px solid #000; padding: 5px 8px; font-size: 11px; }
    .td-r { text-align: right; }
    .total-row td { font-weight: 700; font-size: 13px; background: #f9f9f9; }

    /* Footer CAE */
    .footer { border: 1.5px solid #000; margin-top: 6px; display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; }
    .cae-data { line-height: 1.9; }
    .cae-data strong { margin-right: 4px; }
    .afip-note { font-size: 9px; color: #555; margin-top: 6px; }

    @media print {
      @page { margin: 10mm; }
      .no-print { display: none !important; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <PrintButton />

      <div className="page">
        {/* Cabecera */}
        <div className="cab">
          <div className="cab-iz">
            <div className="empresa">Tkicks</div>
            <div>CUIT: {fmtCuit(cuitEmisor)}</div>
            <div>Monotributista</div>
            <div>Venta de calzado deportivo</div>
          </div>

          <div className="cab-cen">
            <div className="tipo-letra">{tipoLetra}</div>
            <div className="tipo-cod">COD {String(f.cbte_tipo).padStart(2, '0')}</div>
          </div>

          <div className="cab-der">
            <div className="doc-title">FACTURA</div>
            <div className="nro-cbte">Punto de Venta: <strong>{ptoVtaFmt}</strong></div>
            <div className="nro-cbte">Comp. Nro: <strong>{nroCbteFmt}</strong></div>
            <div style={{ marginTop: 6 }}>Fecha de Emisión: {fmtFecha(f.fecha_emision)}</div>
          </div>
        </div>

        {/* Receptor */}
        <div className="sec">
          <div className="sec-row">
            <span><span className="sec-lbl">Receptor:</span> {receptorLinea}</span>
            <span>
              <span className="sec-lbl">Cond. IVA:</span>
              {f.doc_tipo === 80 ? 'Responsable Inscripto' : 'Consumidor Final'}
            </span>
          </div>
        </div>

        {/* Detalle */}
        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th className="td-r" style={{ width: 160 }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{f.descripcion ?? 'Venta'}</td>
              <td className="td-r">$ {fmtMonto(f.imp_total)}</td>
            </tr>
            <tr className="total-row">
              <td className="td-r">IMPORTE TOTAL $</td>
              <td className="td-r">$ {fmtMonto(f.imp_total)}</td>
            </tr>
          </tbody>
        </table>

        {/* CAE + QR */}
        <div className="footer">
          <div className="cae-data">
            <div><strong>CAE N°:</strong> {f.cae}</div>
            <div><strong>Fecha Vto. CAE:</strong> {fmtCaeVto(f.cae_vto)}</div>
            <div className="afip-note">
              Comprobante emitido vía ARCA (ex-AFIP) — Factura Electrónica
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR AFIP" width={120} height={120} />
        </div>
      </div>
    </>
  );
}
