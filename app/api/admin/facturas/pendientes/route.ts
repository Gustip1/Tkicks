import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

export async function GET() {
  // IDs de órdenes que ya tienen factura
  const { data: yaFacturadas } = await sb()
    .from('facturas')
    .select('order_id');

  const idsFacturados: string[] = (yaFacturadas ?? [])
    .map((f: { order_id: string }) => f.order_id)
    .filter(Boolean);

  // Traer todas las órdenes no canceladas
  const { data, error } = await sb()
    .from('orders')
    .select('id, order_number, first_name, last_name, email, phone, document, total, subtotal, payment_method, fulfillment, status, created_at')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filtrar en JS para evitar el bug del .not('id','in',...) con UUIDs en Supabase
  const pendientes = idsFacturados.length === 0
    ? (data ?? [])
    : (data ?? []).filter((o: { id: string }) => !idsFacturados.includes(o.id));

  return NextResponse.json({ orders: pendientes });
}
