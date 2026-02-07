"use client";
import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

// Generar ID único para sesión
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Generar ID de visitante persistente
function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  
  let visitorId = localStorage.getItem('tkicks_visitor_id');
  if (!visitorId) {
    visitorId = `v-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('tkicks_visitor_id', visitorId);
  }
  return visitorId;
}

// Detectar tipo de dispositivo
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

// Detectar browser
function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Trident')) return 'IE';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

// Detectar OS
function getOS(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'MacOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

// Extraer dominio del referrer
function getReferrerDomain(referrer: string): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    // Ignorar el propio dominio
    if (typeof window !== 'undefined' && url.hostname === window.location.hostname) {
      return null;
    }
    return url.hostname;
  } catch {
    return null;
  }
}

// Extraer UTM params
function getUTMParams(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  };
}

interface VisitData {
  session_id: string;
  visitor_id: string;
  page_path: string;
  page_title: string;
  referrer: string | null;
  referrer_domain: string | null;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  user_agent: string;
  device_type: string;
  browser: string;
  os: string;
}

export function useAnalytics() {
  const pathname = usePathname();
  const supabase = createBrowserClient();
  
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pagesViewedRef = useRef<number>(0);

  // Inicializar sesión
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Obtener o crear session ID (persiste durante la sesión del navegador)
    let sessionId = sessionStorage.getItem('tkicks_session_id');
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem('tkicks_session_id', sessionId);
    }
    sessionIdRef.current = sessionId;
    startTimeRef.current = Date.now();
  }, []);

  // Trackear visita inicial y cambios de página
  const trackPageView = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!sessionIdRef.current) return;
    
    // No trackear rutas de admin
    if (pathname.startsWith('/admin')) return;

    const visitData: VisitData = {
      session_id: sessionIdRef.current,
      visitor_id: getVisitorId(),
      page_path: pathname,
      page_title: document.title,
      referrer: document.referrer || null,
      referrer_domain: getReferrerDomain(document.referrer),
      ...getUTMParams(),
      user_agent: navigator.userAgent,
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
    };

    pagesViewedRef.current += 1;

    try {
      await supabase.from('analytics_visits').insert(visitData);
    } catch (error) {
      console.error('Error tracking visit:', error);
    }
  }, [pathname, supabase]);

  // Trackear en cada cambio de ruta
  useEffect(() => {
    // Pequeño delay para asegurar que el session ID está listo
    const timer = setTimeout(() => {
      trackPageView();
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, trackPageView]);

  // Actualizar duración al salir
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!sessionIdRef.current) return;
      
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Usar sendBeacon para enviar datos antes de cerrar
      const data = {
        session_id: sessionIdRef.current,
        duration_seconds: duration,
        pages_viewed: pagesViewedRef.current,
      };
      
      // Llamar a la función RPC de Supabase via fetch beacon
      navigator.sendBeacon(
        '/api/analytics/exit',
        JSON.stringify(data)
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleBeforeUnload();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Función para trackear eventos personalizados
  const trackEvent = useCallback(async (
    eventName: string,
    eventCategory?: string,
    eventData?: Record<string, any>
  ) => {
    if (!sessionIdRef.current) return;
    
    try {
      await supabase.from('analytics_events').insert({
        session_id: sessionIdRef.current,
        event_name: eventName,
        event_category: eventCategory,
        event_data: eventData || {},
        page_path: pathname,
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }, [pathname, supabase]);

  return { trackEvent };
}
