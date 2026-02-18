import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { publicApiLimiter } from '@/lib/security/rate-limiter';
import { getClientIp } from '@/lib/security/get-client-ip';

export const dynamic = 'force-dynamic';

// Validate session_id format (timestamp-random)
const SESSION_ID_REGEX = /^\d{13}-[a-z0-9]{1,20}$/;

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  // Rate limiting: prevent abuse
  if (publicApiLimiter.isBlocked(clientIp)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { session_id, duration_seconds, pages_viewed } = body;

    // Validate session_id format
    if (!session_id || typeof session_id !== 'string' || !SESSION_ID_REGEX.test(session_id)) {
      return NextResponse.json({ error: 'Invalid session_id' }, { status: 400 });
    }

    // Validate duration_seconds (max 24h = 86400s)
    const safeDuration = typeof duration_seconds === 'number' 
      ? Math.min(Math.max(0, Math.floor(duration_seconds)), 86400) 
      : 0;

    // Validate pages_viewed (max 500)
    const safePages = typeof pages_viewed === 'number' 
      ? Math.min(Math.max(1, Math.floor(pages_viewed)), 500) 
      : 1;

    const supabase = createServerSupabase();

    await supabase
      .from('analytics_visits')
      .update({
        duration_seconds: safeDuration,
        pages_viewed: safePages,
        is_bounce: safePages <= 1,
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
