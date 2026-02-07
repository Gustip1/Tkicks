import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, duration_seconds, pages_viewed } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Actualizar la última visita de esta sesión
    await supabase
      .from('analytics_visits')
      .update({
        duration_seconds: duration_seconds || 0,
        pages_viewed: pages_viewed || 1,
        is_bounce: (pages_viewed || 1) <= 1,
        exited_at: new Date().toISOString(),
      })
      .eq('session_id', session_id)
      .is('exited_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics exit error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
