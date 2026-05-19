import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

// GET /api/admin/facturas/pendientes
// Devuelve órdenes pagadas que todavía no tienen factura emitida.
export async function GET() {
  // IDs de órdenes ya facturadas
  const { data: yaFacturadas } = await sb()
    .from('facturas')
    .select('order_id');

  const idsFacturados = (yaFacturadas ?? [])
    .map((f: { order_id: string }) => f.order_id)
    .filter(Boolean);

  // Órdenes no canceladas, ordenadas por más recientes
  let query = sb()
    .from('orders')
    .select('id, order_number, first_name, last_name, email, phone, document, total, subtotal, payment_method, fulfillment, status, created_at')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(100);

  if (idsFacturados.length > 0) {
    query = query.not('id', 'in', `(${idsFacturados.join(',')})`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orders: data });
}
