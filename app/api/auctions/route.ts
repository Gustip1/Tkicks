import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const sb = service();

  // Cierre lazy de subastas vencidas antes de listar.
  await sb.rpc('finalize_expired_auctions');

  const { data, error } = await sb.rpc('list_active_auctions');
  if (error) {
    console.error('[AUCTIONS] list error:', error);
    return NextResponse.json({ error: 'No se pudo listar' }, { status: 500 });
  }

  return NextResponse.json({ auctions: data || [] });
}
