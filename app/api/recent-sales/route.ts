import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/** Solo ventas de las últimas 48 h: el aviso dice "hace X" o "ayer", y tiene que ser cierto */
const WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Ventas recientes para el aviso flotante (RecentSaleToast). Los pedidos son
 * privados: el servidor los lee y devuelve solo qué se vendió, la ciudad del
 * envío (si la hay) y cuándo. Nunca nombre, email ni dirección.
 */
export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: orders } = await supabase
    .from('orders')
    .select('id, created_at')
    .eq('status', 'paid')
    .gte('created_at', new Date(Date.now() - WINDOW_MS).toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  const ids = (orders ?? []).map((o) => o.id);
  if (!ids.length) {
    return NextResponse.json({ sales: [] }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  }

  const [{ data: items }, { data: addresses }] = await Promise.all([
    supabase.from('order_items').select('order_id, title, product_id').in('order_id', ids),
    supabase.from('shipping_addresses').select('order_id, city').in('order_id', ids),
  ]);

  const productIds = Array.from(new Set((items ?? []).map((i) => i.product_id).filter(Boolean)));
  const { data: products } = productIds.length
    ? await supabase.from('products').select('id, images').in('id', productIds)
    : { data: [] as { id: string; images: { url?: string }[] | null }[] };

  const itemByOrder = new Map((items ?? []).map((i) => [i.order_id, i]));
  const cityByOrder = new Map((addresses ?? []).map((a) => [a.order_id, String(a.city ?? '').trim() || null]));
  const imageById = new Map((products ?? []).map((p) => [p.id, p.images?.[0]?.url ?? null]));

  const sales = (orders ?? [])
    .filter((o) => itemByOrder.has(o.id))
    .map((o) => {
      const item = itemByOrder.get(o.id)!;
      return {
        title: item.title,
        city: cityByOrder.get(o.id) ?? null,
        createdAt: o.created_at,
        imageUrl: item.product_id ? imageById.get(item.product_id) ?? null : null,
      };
    });

  return NextResponse.json({ sales }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}
