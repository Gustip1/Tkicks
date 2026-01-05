import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }

  // Crear cliente con service role para bypass RLS en storage
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const outputs: { url: string }[] = [];

  try {
    for (const file of files) {
      if (!(file instanceof File)) continue;
      
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        console.warn(`Tipo de archivo no válido: ${file.type}`);
        continue;
      }

      // Generar nombre único
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      
      // Convertir a buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Subir con service role key (bypass RLS)
      const { data, error } = await supabaseAdmin.storage
        .from('product-images')
        .upload(fileName, buffer, {
          contentType: file.type,
          cacheControl: '31536000',
          upsert: false
        });

      if (error) {
        console.error('Error uploading to Supabase Storage:', error.message);
        continue;
      }

      // Obtener URL pública
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
      error: 'Error al subir las imágenes. Intenta nuevamente.' 
    }, { status: 500 });
  }
}


