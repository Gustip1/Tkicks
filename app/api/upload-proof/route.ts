import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supaSSR = createServerSupabase();
  const {
    data: { user }
  } = await supaSSR.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
  const supabase = createClient(url, serviceRole);

  const form = await req.formData();
  const file = form.get('file');
  const orderId = String(form.get('order_id') || '');
  if (!file || !(file instanceof File) || !orderId) {
    return NextResponse.json({ error: 'file y order_id requeridos' }, { status: 400 });
  }

  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf as ArrayBuffer);
  const path = `payment-proofs/${orderId}-${Date.now()}.jpg`;
  const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, buffer, {
    contentType: file.type || 'image/jpeg',
    upsert: false
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  const { data: pub } = supabase.storage.from('payment-proofs').getPublicUrl(path);

  const { error: updErr } = await supaSSR
    .from('orders')
    .update({ payment_proof_url: pub.publicUrl, payment_method: 'bank_transfer', payment_alias: 'gus.p21', payment_status: 'pending' })
    .eq('id', orderId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, url: pub.publicUrl });
}


