import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

// Cambiar a nodejs runtime para evitar problemas con sharp en edge
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

  // Obtener el token de sesión del usuario
  const { data: { session } } = await supaSSR.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }

  // Llamar a la función de Supabase para comprimir y subir las imágenes
  const functionUrl = `${supabaseUrl}/functions/v1/compress-image`;
  
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Supabase function error:', error);
      return NextResponse.json({ 
        error: error.error || 'Error al procesar las imágenes en Supabase' 
      }, { status: response.status });
    }

    const outputs = await response.json();
    return NextResponse.json(outputs);
  } catch (error) {
    console.error('Error calling Supabase function:', error);
    return NextResponse.json({ 
      error: 'Error al procesar las imágenes. Intenta nuevamente.' 
    }, { status: 500 });
  }
}


