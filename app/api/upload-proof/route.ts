import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sin límite de tamaño - removido a petición del usuario
// const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  const supaSSR = createServerSupabase();
  const {
    data: { user }
  } = await supaSSR.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    const orderId = String(form.get('order_id') || '');

    // Validación de entrada
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }

    if (!orderId || orderId.length === 0) {
      return NextResponse.json({ error: 'order_id requerido' }, { status: 400 });
    }

    // Validar UUID format para orderId (prevenir path traversal)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json({ error: 'order_id inválido' }, { status: 400 });
    }

    // Validación de tamaño removida - sin límite de tamaño de archivo
    
    // Validar tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, WebP)' },
        { status: 400 }
      );
    }

    // Verificar que la orden pertenece al usuario
    const { data: order, error: orderError } = await supaSSR
      .from('orders')
      .select('id, user_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Solo el propietario de la orden puede subir el comprobante
    // (o un admin, pero por ahora lo dejamos solo para el propietario)
    if (order.user_id && order.user_id !== user.id) {
      console.warn(`[SECURITY] Usuario ${user.id} intentó subir comprobante para orden ${orderId} que no le pertenece`);
      return NextResponse.json({ error: 'No tienes permiso para modificar esta orden' }, { status: 403 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
    const supabase = createClient(url, serviceRole);

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf as ArrayBuffer);

    // Generar nombre de archivo seguro
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `payment-proofs/${orderId}-${timestamp}-${randomStr}.${extension}`;

    const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: '3600'
    });

    if (upErr) {
      console.error('[ERROR] Error al subir comprobante:', upErr);
      return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from('payment-proofs').getPublicUrl(path);

    const { error: updErr } = await supaSSR
      .from('orders')
      .update({
        payment_proof_url: pub.publicUrl,
        payment_method: 'bank_transfer',
        payment_alias: 'gus.p21',
        payment_status: 'pending'
      })
      .eq('id', orderId);

    if (updErr) {
      console.error('[ERROR] Error al actualizar orden:', updErr);
      return NextResponse.json({ error: 'Error al actualizar la orden' }, { status: 500 });
    }

    console.info(`[INFO] Comprobante de pago subido para orden ${orderId} por usuario ${user.id}`);

    return NextResponse.json({ ok: true, url: pub.publicUrl });
  } catch (error: any) {
    console.error('[ERROR] Error inesperado en /api/upload-proof:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}


