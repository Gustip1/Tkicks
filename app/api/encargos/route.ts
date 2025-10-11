import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const body = await req.json().catch(() => null);
  if (!body || !body.message) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('custom_orders')
    .insert({ customer_email: body.customer_email || null, message: body.message })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}


