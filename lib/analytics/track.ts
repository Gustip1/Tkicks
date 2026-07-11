"use client";

/**
 * Tracker liviano para eventos puntuales (clicks, CTAs, conversiones).
 * Usa sendBeacon para que el evento sobreviva aunque el usuario navegue
 * a otro sitio (links externos como Passline o WhatsApp).
 * Comparte session_id / visitor_id con useAnalytics.
 */

const SESSION_KEY = 'tkicks_session_id';
const VISITOR_KEY = 'tkicks_visitor_id';

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function getVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = `v-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(VISITOR_KEY, visitorId);
  }
  return visitorId;
}

export function trackEvent(
  eventName: string,
  eventCategory?: string,
  eventData?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;

  try {
    const payload = JSON.stringify({
      session_id: getSessionId(),
      event_name: eventName,
      event_category: eventCategory ?? null,
      event_data: { ...eventData, visitor_id: getVisitorId() },
      page_path: window.location.pathname,
    });

    const sent = navigator.sendBeacon?.(
      '/api/analytics/event',
      new Blob([payload], { type: 'application/json' })
    );

    if (!sent) {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // El tracking nunca debe romper la UI
  }
}
