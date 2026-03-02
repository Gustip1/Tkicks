import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars');
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }

  // Auth check
  const supaSSR = await createServerSupabase();
  const { data: { user } } = await supaSSR.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado. Iniciá sesión primero.' }, { status: 401 });
  }

  const { data: profile } = await supaSSR.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'No tenés permisos de admin' }, { status: 403 });
  }

  // Parse files
  const formData = await req.formData();
  const files = formData.getAll('files');
  if (!files || files.length === 0) return NextResponse.json([], { status: 200 });

  // Admin client for storage (bypass RLS)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const outputs: { url: string }[] = [];

  try {
    for (const file of files) {
      if (!(file instanceof File)) continue;

      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        console.warn(`Tipo de archivo no válido: ${file.type}`);
        continue;
      }

      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error } = await supabaseAdmin.storage
        .from('product-images')
        .upload(fileName, buffer, {
          contentType: file.type,
          cacheControl: '31536000',
          upsert: false,
        });

      if (error) {
        console.error('Storage upload error:', error.message);
        continue;
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('product-images')
        .getPublicUrl(fileName);

      if (publicUrlData?.publicUrl) {
        outputs.push({ url: publicUrlData.publicUrl });
      }
    }

    return NextResponse.json(outputs);
  } catch (error) {
    console.error('Error processing images:', error);
    return NextResponse.json({
      error: 'Error al subir las imágenes. Intenta nuevamente.',
    }, { status: 500 });
  }
}


