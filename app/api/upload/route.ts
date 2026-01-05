import { NextRequest, NextResponse } from 'next/server';
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!supabaseUrl) {
    console.error('Missing Supabase configuration');
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }

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

      // Subir directamente a Supabase Storage
      const { data, error } = await supaSSR.storage
        .from('product-images')
        .upload(fileName, buffer, {
          contentType: file.type,
          cacheControl: '31536000', // 1 año de cache
          upsert: false
        });

      if (error) {
        console.error('Error uploading to Supabase Storage:', error);
        continue;
      }

      // Obtener URL pública
      const { data: publicUrlData } = supaSSR.storage
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


