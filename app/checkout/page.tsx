import CheckoutClient from './CheckoutClient';
import { paywayPublicConfig } from '@/lib/payments/payway';

export const metadata = { title: 'Finalizar compra | Tkicks', robots: { index: false, follow: false } };

/**
 * El checkout es una página del navegador (carrito, datos guardados); acá solo
 * se le pasa si el pago con tarjeta está habilitado y la clave pública de
 * Payway. Sin claves cargadas, la tarjeta sigue por el link de WhatsApp.
 * Las claves se leen al compilar: después de cargarlas en Vercel, redeploy.
 */
export default function CheckoutPage() {
  return <CheckoutClient payway={paywayPublicConfig()} />;
}
