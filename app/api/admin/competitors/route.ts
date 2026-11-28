import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';
import { CompetitorSite, normalizeSiteUrl } from '@/lib/competitors';
import { detectPlatform, searchSite } from '@/lib/competitorFetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'No autorizado' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { ok: false as const, status: 403, error: 'Sólo admin' };
  return { ok: true as const };
}

function service() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

/**
 * Busca un producto en las webs de la competencia que cargó el dueño.
 * GET ?q=título → resultados por tienda (precios en su moneda).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const q = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 160);
  if (q.length < 3) return NextResponse.json({ error: 'Escribí el nombre del producto.' }, { status: 400 });

  const { data, error } = await service().from('competitor_sites').select('*').eq('active', true).order('name').limit(12);
  if (error) return NextResponse.json({ ready: false, sites: [] });

  const sites = (data ?? []) as CompetitorSite[];
  const results = await Promise.all(sites.map((s) => searchSite(s, q)));
  return NextResponse.json({ ready: true, sites: results });
}

/** Prueba una web antes de guardarla: POST { url } → cómo se puede leer */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const origin = normalizeSiteUrl(String(body?.url ?? ''));
  if (!origin) return NextResponse.json({ error: 'Revisá la dirección: tiene que ser la web de la tienda, por ejemplo www.tienda.com.ar' }, { status: 400 });

  const platform = await detectPlatform(origin);
  return NextResponse.json({ url: origin, platform });
}
