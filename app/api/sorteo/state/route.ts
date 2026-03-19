import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'giveaway_active')
      .maybeSingle();

    const active = Boolean(data?.value);
    return NextResponse.json({ active, codeLength: 6 });
  } catch (error) {
    console.error('[ERROR] GET /api/sorteo/state:', error);
    return NextResponse.json({ active: false, codeLength: 6 });
  }
}
