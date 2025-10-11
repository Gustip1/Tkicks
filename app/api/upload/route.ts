import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Guard: only admins
  const supaSSR = createServerSupabase();
  const {
    data: { user }
  } = await supaSSR.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supaSSR.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const files = formData.getAll('files');
  if (!files || files.length === 0) return NextResponse.json([], { status: 200 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
  const supabase = createClient(supabaseUrl, serviceRole);

  const outputs: { url: string }[] = [];
  for (const f of files) {
    if (!(f instanceof File)) continue;
    const arrayBuf = await f.arrayBuffer();
    let buf: Buffer = Buffer.from(arrayBuf as ArrayBuffer);
    const fileNameBase = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const mime = f.type;
    
    // Solo aceptar JPG, PNG, WebP
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
      continue; // Saltar archivos no soportados
    }
    // Ensure reasonable format and size using sharp
    const image = sharp(buf, { animated: false });
    const metadata = await image.metadata();
    const width = Math.min(metadata.width || 2000, 2000);
    const pipeline = image.resize({ width, withoutEnlargement: true });
    if (mime === 'image/webp') buf = await pipeline.webp({ quality: 82 }).toBuffer();
    else if (mime === 'image/png') buf = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    else buf = await pipeline.jpeg({ quality: 85 }).toBuffer();

    const ext = mime === 'image/webp' ? 'webp' : mime === 'image/png' ? 'png' : 'jpg';
    const path = `product-images/${fileNameBase}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, buf, {
      contentType: mime,
      upsert: false
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
    outputs.push({ url: pub.publicUrl });
  }

  return NextResponse.json(outputs);
}


