import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { summarizeAllViews, ViewRow, VIEWS_WINDOW_MS } from '@/lib/productViews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE = 1000;
const MAX_PAGES = 30;

/**
 * Cuántas personas vieron cada producto, para las tarjetas del catálogo.
 * Devuelve solo totales por producto (ningún dato de quién): slug → visitas.
 *
 * Se guarda 10 minutos en la red de Vercel: toda la tienda comparte una sola
 * consulta a la base cada tanto, no una por visita.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' };
  if (!url || !key) return NextResponse.json({ views: {} }, { headers });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const since = new Date(Date.now() - VIEWS_WINDOW_MS).toISOString();
  const rows: (ViewRow & { page_path: string })[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('analytics_visits')
      .select('session_id, visitor_id, created_at, page_path')
      .like('page_path', '/producto/%')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) {
      console.error('[PRODUCT-VIEWS] No se pudieron leer las visitas:', error.message);
      // Sin caché larga: que se vuelva a intentar pronto
      return NextResponse.json({ views: {} }, { headers: { 'Cache-Control': 'public, s-maxage=30' } });
    }
    rows.push(...((data ?? []) as (ViewRow & { page_path: string })[]));
    if (!data || data.length < PAGE) break;
  }

  return NextResponse.json({ views: summarizeAllViews(rows) }, { headers });
}
