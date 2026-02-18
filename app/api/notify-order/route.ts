import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();

    // Verify admin authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      console.warn(`[SECURITY] Intento no autorizado de notify-order por usuario ${user.id}`);
      return NextResponse.json({ ok: false, error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId: string | undefined = body?.order_id;
    if (!orderId) return NextResponse.json({ ok: false, error: 'order_id requerido' }, { status: 400 });

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json({ ok: false, error: 'order_id inválido' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Obtener orden y asegurar permisos (admin via RLS)
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_number, email, first_name, last_name, status, created_at')
      .eq('id', orderId)
      .single();
    if (error || !order) return NextResponse.json({ ok: false, error: error?.message || 'Orden no encontrada' }, { status: 404 });

    const orderNumber = order.order_number || 'PENDIENTE';
    const email = order.email || '';

    // Use a safe host value - prefer env var over request header to prevent host injection
    const siteHost = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.get('host') || 'tkicks.com.ar'}`;

    // Mensaje por defecto (para enviar por email/WhatsApp)
    const message = `Hola ${order.first_name || ''} ${order.last_name || ''}!
Gracias por tu compra en Tkicks.

Tu número de orden es: ${orderNumber}.

Podés seguir el estado de tu pedido así:
1) Si tenés cuenta de Google, iniciá sesión en la web (Login con Google) y entrá a Mis Pedidos: ${siteHost}/orders
2) O ingresá a ${siteHost}/track y poné este número de orden junto a tu email (${email}).

Ante cualquier consulta, respondé este mensaje con tu número de orden. Gracias!`;

    // Aquí integrar proveedor de email/SMS/WhatsApp (stub)
    // Por ahora devolvemos el mensaje para que el admin lo vea/copie

    return NextResponse.json({ ok: true, messagePreview: message });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error inesperado' }, { status: 500 });
  }
}


