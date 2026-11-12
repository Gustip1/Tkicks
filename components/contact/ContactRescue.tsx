"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LeadSheet } from '@/components/contact/LeadSheet';
import { INTENT_EVENT, WhatsAppIntent, closeWhatsAppIntent, readWhatsAppIntent } from '@/lib/contact';
import { trackEvent } from '@/lib/analytics/track';

/** Cuánto se espera después del toque antes de preguntar */
const WAIT_MS = 5000;

/**
 * Rescate de consultas: quien tocó un botón de WhatsApp y vuelve a la web (o
 * nunca salió, porque WhatsApp no se abrió) puede dejar su número para que le
 * escribamos nosotros.
 *
 * Por qué: 2 de cada 3 toques en WhatsApp vienen del navegador de Instagram,
 * que muchas veces no abre la app. El panel los contaba como consultas y al
 * dueño nunca le llegaba el mensaje. Se pregunta una sola vez por visita.
 */
export function ContactRescue() {
  const pathname = usePathname();
  const [intent, setIntent] = useState<WhatsAppIntent | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const pending = readWhatsAppIntent();
    if (!pending) return;
    const wait = Math.max(0, WAIT_MS - (Date.now() - pending.at));
    timer.current = setTimeout(() => {
      // Solo si la persona está mirando la web: si está en WhatsApp, se pregunta al volver
      if (document.visibilityState !== 'visible') return;
      const still = readWhatsAppIntent();
      if (still) setIntent(still);
    }, wait);
  }, []);

  useEffect(() => {
    check();
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', check);
    window.addEventListener(INTENT_EVENT, check);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', check);
      window.removeEventListener(INTENT_EVENT, check);
    };
  }, [check, pathname]);

  if (pathname.startsWith('/admin') || pathname.startsWith('/checkout')) return null;

  const close = (confirmed: boolean) => {
    if (intent) trackEvent(confirmed ? 'whatsapp_confirmed' : 'whatsapp_rescue_closed', 'contact', { source: intent.source });
    closeWhatsAppIntent();
    setIntent(null);
  };

  const about = intent?.productTitle
    ? `Consulta por ${intent.productTitle}${intent.size ? `, talle ${intent.size}` : ''}`
    : '';

  return (
    <LeadSheet
      open={Boolean(intent)}
      onClose={() => close(false)}
      title="¿Llegaste a escribirnos?"
      description="Desde Instagram a veces WhatsApp no se abre. Dejanos tu número y te escribimos nosotros."
      lead={{
        kind: 'question',
        product_slug: intent?.productSlug ?? null,
        product_title: intent?.productTitle ?? null,
        size: intent?.size ?? null,
      }}
      messageLabel="Tu consulta"
      defaultMessage={about}
      savedTitle="Listo, te escribimos"
      waText={({ message }) => message || 'Hola! Vengo de la web de Tkicks. Quería hacerte una consulta.'}
      source="rescue"
      footer={
        <button type="button" onClick={() => close(true)} className="btn-apple-ghost w-full">
          Ya les escribí
        </button>
      }
    />
  );
}
