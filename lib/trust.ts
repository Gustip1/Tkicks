/**
 * Confianza para quien entra por primera vez: garantías y preguntas
 * frecuentes. Todo lo que dice acá es cierto y ya figura en otras partes de la
 * web (términos, ficha, checkout). Si cambia una regla del negocio, se cambia
 * acá y en /terminos.
 *
 * Reemplaza al aviso de "se vendió hace X" (el dueño pidió sacarlo en nov
 * 2026: no quiere que se vea quién compró ni cuánto).
 */

export interface Guarantee {
  key: 'original' | 'shipping' | 'payment' | 'showroom';
  title: string;
  text: string;
}

export const GUARANTEES: Guarantee[] = [
  { key: 'original', title: '100% original', text: 'Cada producto se entrega con su comprobante de compra.' },
  { key: 'shipping', title: 'Envío gratis', text: 'A todo el país, con seguimiento hasta tu casa.' },
  { key: 'payment', title: 'Pagá como quieras', text: 'Transferencia, efectivo o tarjeta en hasta 6 cuotas.' },
  { key: 'showroom', title: 'Showroom en San Juan', text: 'Vení a verlo en persona, con cita previa.' },
];

export interface FaqItem {
  id: string;
  q: string;
  /** Texto plano: también va a los datos estructurados de Google */
  a: string;
  link?: { href: string; label: string };
}

export const FAQ: FaqItem[] = [
  {
    id: 'originales',
    q: '¿Los productos son originales?',
    a: 'Sí. Todo lo que vendemos es 100% original y se entrega con su comprobante de compra. No trabajamos réplicas.',
  },
  {
    id: 'envios',
    q: '¿Hacen envíos? ¿Cómo sé que me llega?',
    a: 'Enviamos gratis a todo el país. Cuando despachamos tu pedido te avisamos por WhatsApp o email y lo podés seguir desde la web.',
    link: { href: '/track', label: 'Seguí tu pedido' },
  },
  {
    id: 'pagos',
    q: '¿Cómo puedo pagar?',
    a: 'Por transferencia, con criptomonedas, en efectivo al retirar o con tarjeta de crédito: 1 pago sin recargo, 3 cuotas con 10% o 6 cuotas con 20%, salvo promoción vigente. Los pagos con tarjeta los procesa Payway; Tkicks no guarda los datos de tu tarjeta.',
  },
  {
    id: 'dolares',
    q: '¿Por qué los precios están en dólares?',
    a: 'Los publicamos en dólares y pagás en pesos, al tipo de cambio oficial del día. En cada producto ves el precio en pesos ya calculado.',
  },
  {
    id: 'showroom',
    q: '¿Puedo ver el producto antes de comprarlo?',
    a: 'Sí. Tenemos showroom en San Juan y atendemos con cita previa: escribinos por WhatsApp y coordinamos. También podés retirar tu compra ahí.',
  },
  {
    id: 'cambios',
    q: '¿Tienen cambio?',
    a: 'No. Son piezas exclusivas, casi siempre última unidad, y las ventas son finales. Por eso cada ficha tiene su guía de talles con medidas, y te ayudamos a elegir por WhatsApp antes de que pagues. Si recibís algo distinto a lo que compraste o con una falla de fábrica, lo resolvemos.',
    link: { href: '/terminos#cambios', label: 'Ver las condiciones' },
  },
  {
    id: 'encargos',
    q: 'No está mi talle o busco otro modelo, ¿lo consiguen?',
    a: 'Sí. Desde la ficha podés avisarnos qué talle buscás, o hacer un encargo de cualquier modelo. Los encargos se confirman con una seña del 75% y no se pueden cancelar ni reembolsar.',
    link: { href: '/encargos', label: 'Hacer un encargo' },
  },
];

/** Las que más pesan justo antes de comprar, para la ficha del producto */
export const FAQ_PRODUCT_IDS = ['originales', 'envios', 'cambios', 'pagos'];

/** Datos estructurados de preguntas frecuentes (schema.org) */
export function faqJsonLd(items: FaqItem[] = FAQ) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
