import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  requestCAE,
  getTitular,
  type PaymentMethod,
  type TipoComprobante,
  type TipoConcepto,
} from '@/lib/arca/arcaService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

interface FacturaRequest {
  order_id: string;
  payment_method: PaymentMethod;
  /** Punto de venta configurado en ARCA (ej. 1) */
  pto_vta: number;
  /** 1=Factura A, 6=Factura B, 11=Factura C */
  cbte_tipo: TipoComprobante;
  /** 1=Productos, 2=Servicios, 3=Mixto */
  concepto: TipoConcepto;
  /** Importe total en ARS */
  imp_total: number;
  /** CUIT/DNI del receptor (0 si es consumidor final) */
  doc_nro: number;
  /** 80=CUIT, 96=DNI, 99=Consumidor Final */
  doc_tipo: 80 | 96 | 99;
  descripcion?: string;
}

// ─── POST /api/admin/facturas ─────────────────────────────────────────────────
// Crea una factura electrónica en ARCA y la guarda en Supabase.
export async function POST(req: NextRequest) {
  try {
    const body: FacturaRequest = await req.json();

    // Validación mínima
    if (!body.order_id || !body.payment_method || !body.imp_total) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // ── Selección automática del cliente ARCA ──────────────────────────────
    // installments_3 (tarjeta) → cardClient (segundo titular)
    // cash / crypto_transfer  → standardClient (titular principal)
    const titular = getTitular(body.payment_method);

    const caeResult = await requestCAE(body.payment_method, {
      ptoVta: body.pto_vta,
      cbteTipo: body.cbte_tipo,
      concepto: body.concepto,
      docNro: body.doc_nro,
      docTipo: body.doc_tipo,
      impTotal: body.imp_total,
      impNeto: body.imp_total, // monotributistas: neto = total
      impIVA: 0,               // monotributistas: sin IVA discriminado
      descripcion: body.descripcion,
    });

    if (caeResult.Resultado !== 'A') {
      return NextResponse.json(
        { error: 'ARCA rechazó el comprobante', detalle: caeResult },
        { status: 422 },
      );
    }

    // ── Persistir en Supabase ──────────────────────────────────────────────
    const { data: factura, error: dbError } = await sb()
      .from('facturas')
      .insert({
        order_id: body.order_id,
        titular_emisor: titular,           // 'standard' | 'card'
        payment_method: body.payment_method,
        cbte_tipo: body.cbte_tipo,
        pto_vta: body.pto_vta,
        cbte_nro: caeResult.CbteDesde,
        cae: caeResult.CAE,
        cae_vto: caeResult.CAEFchVto,
        imp_total: body.imp_total,
        doc_tipo: body.doc_tipo,
        doc_nro: body.doc_nro,
        descripcion: body.descripcion ?? null,
        fecha_emision: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ ok: true, factura, cae: caeResult.CAE });
  } catch (err: unknown) {
    console.error('[facturas] Error:', err);
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET /api/admin/facturas?titular=standard|card ───────────────────────────
// Lista facturas, opcionalmente filtradas por titular.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const titular = searchParams.get('titular'); // 'standard' | 'card' | null

  let query = sb()
    .from('facturas')
    .select('*, orders(order_number, contact_name)')
    .order('fecha_emision', { ascending: false })
    .limit(200);

  if (titular === 'standard' || titular === 'card') {
    query = query.eq('titular_emisor', titular);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ facturas: data });
}
