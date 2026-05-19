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

// ─── GET /api/admin/facturas?titular=standard|card ────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const titular = searchParams.get('titular');

  let query = sb()
    .from('facturas')
    .select('*, orders(order_number, first_name, last_name)')
    .order('fecha_emision', { ascending: false })
    .limit(200);

  if (titular === 'standard' || titular === 'card') {
    query = query.eq('titular_emisor', titular);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ facturas: data });
}

// ─── POST /api/admin/facturas ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      order_id: string;
      payment_method: PaymentMethod;
      pto_vta: number;
      cbte_tipo: TipoComprobante;
      concepto: TipoConcepto;
      imp_total: number;
      doc_nro: number;
      doc_tipo: 80 | 96 | 99;
      descripcion?: string;
    };

    if (!body.order_id || !body.payment_method || !body.imp_total) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Verificar que no esté ya facturada
    const { data: existing } = await sb()
      .from('facturas')
      .select('id')
      .eq('order_id', body.order_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Esta orden ya tiene una factura emitida.' }, { status: 409 });
    }

    const titular = getTitular(body.payment_method);

    const caeResult = await requestCAE(body.payment_method, {
      ptoVta:     body.pto_vta,
      cbteTipo:   body.cbte_tipo,
      concepto:   body.concepto,
      docNro:     body.doc_nro,
      docTipo:    body.doc_tipo,
      impTotal:   body.imp_total,
      impNeto:    body.imp_total,
      impIVA:     0,
      descripcion: body.descripcion,
    });

    if (caeResult.Resultado !== 'A') {
      return NextResponse.json(
        { error: 'ARCA rechazó el comprobante', detalle: caeResult },
        { status: 422 },
      );
    }

    const { data: factura, error: dbError } = await sb()
      .from('facturas')
      .insert({
        order_id:       body.order_id,
        titular_emisor: titular,
        payment_method: body.payment_method,
        cbte_tipo:      body.cbte_tipo,
        pto_vta:        body.pto_vta,
        cbte_nro:       caeResult.CbteDesde,
        cae:            caeResult.CAE,
        cae_vto:        caeResult.CAEFchVto,
        imp_total:      body.imp_total,
        doc_tipo:       body.doc_tipo,
        doc_nro:        body.doc_nro,
        descripcion:    body.descripcion ?? null,
        fecha_emision:  new Date().toISOString(),
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
