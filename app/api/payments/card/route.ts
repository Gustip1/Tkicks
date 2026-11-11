import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cardPaymentLimiter } from '@/lib/security/rate-limiter';
import { getClientIp } from '@/lib/security/get-client-ip';
import { createOrder, discardOrder, writeOrder, OrderRequestBody } from '@/lib/orders/create';
import { fetchOfficialDollarRate } from '@/lib/dollarRate';
import {
  BillingAddress,
  CARD_BRAND_LABEL,
  canonicalProvince,
  cardBrandOf,
  cardMultiplier,
  cardTotalArs,
  isCardInstallments,
  sameCharge,
  validPostalCode,
} from '@/lib/payments/card';
import { chargeCard, paymentSummary, paywayServerConfig } from '@/lib/payments/payway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Payway puede tardar con algunos bancos: se le dan 30 s y un margen para buscar el pago
export const maxDuration = 60;

interface CardPaymentBody extends OrderRequestBody {
  card: {
    token: string;
    bin: string;
    lastFour?: string;
    installments: number;
    /** El total en pesos que vio el cliente */
    totalArs: number;
    /** Huella del dispositivo de decidir.js (control de fraude) */
    deviceId?: string | null;
    /** Dirección de facturación; null = la misma que la de envío */
    billing?: BillingAddress | null;
  };
}

/** Facturación: la que cargó el cliente o, si eligió "igual que la de envío", la de envío */
function resolveBilling(body: CardPaymentBody): BillingAddress | null {
  const b = body.card.billing;
  const raw: BillingAddress | null = b
    ? b
    : body.fulfillment === 'shipping' && body.address
      ? {
          street: [body.address.street, body.address.number].filter((x) => x?.trim()).join(' '),
          postalCode: body.address.postalCode,
          city: body.address.city,
          province: body.address.province,
        }
      : null;
  if (!raw) return null;
  const province = canonicalProvince(String(raw.province ?? ''));
  const street = String(raw.street ?? '').trim();
  const city = String(raw.city ?? '').trim();
  const postalCode = String(raw.postalCode ?? '').trim();
  if (!province || !street || !city || !validPostalCode(postalCode)) return null;
  return { street, city, postalCode, province };
}

const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Cobro con tarjeta de crédito por Payway.
 *
 * 1. Reserva el stock creando el pedido (igual que efectivo y transferencia).
 * 2. Calcula el monto en pesos acá: precio de la base × dólar oficial × recargo
 *    (1 pago sin recargo; 3 cuotas +10%, o sin recargo con la promo activa).
 *    Si no coincide con lo que vio el cliente, no cobra y le muestra el nuevo.
 * 3. Cobra el token. Aprobado: pedido pagado. Rechazado: se deshace el pedido y
 *    vuelve el stock. Sin respuesta del banco: el pedido queda pendiente para
 *    revisarlo, sin liberar el stock (el cobro pudo haber salido).
 */
export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  if (cardPaymentLimiter.isBlocked(clientIp)) {
    return NextResponse.json(
      { error: 'Hubo demasiados intentos con tarjeta. Esperá 15 minutos o elegí otro medio de pago.' },
      { status: 429 }
    );
  }

  const cfg = paywayServerConfig();
  if (!cfg) {
    return NextResponse.json({ error: 'El pago con tarjeta no está disponible. Elegí otro medio de pago.' }, { status: 503 });
  }

  let body: CardPaymentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
  }

  const card = body.card;
  const installments = card?.installments;
  if (!card || !TOKEN.test(String(card.token)) || !/^\d{6,8}$/.test(String(card.bin)) || !isCardInstallments(installments)) {
    return NextResponse.json({ error: 'Faltan datos de la tarjeta. Revisalos y probá de nuevo.' }, { status: 400 });
  }
  if (!(typeof card.totalArs === 'number' && card.totalArs > 0)) {
    return NextResponse.json({ error: 'Falta el total a pagar' }, { status: 400 });
  }

  const brand = cardBrandOf(card.bin);
  if (!brand || !cfg.brands.includes(brand)) {
    const accepted = cfg.brands.map((b) => CARD_BRAND_LABEL[b]).join(', ');
    return NextResponse.json({ error: `Aceptamos tarjetas de crédito ${accepted}.` }, { status: 400 });
  }

  // El control de fraude de Payway pide la dirección de facturación
  const billing = resolveBilling(body);
  if (!billing) {
    return NextResponse.json(
      { code: 'billing', error: 'Revisá la dirección de facturación: calle y número, código postal, localidad y provincia.' },
      { status: 400 }
    );
  }
  const deviceId = typeof card.deviceId === 'string' && /^[\w-]{8,64}$/.test(card.deviceId) ? card.deviceId : null;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Dólar y promo del momento, del lado del servidor
  const [dollar, promoRow] = await Promise.all([
    fetchOfficialDollarRate(),
    supabase.from('settings').select('value').eq('key', 'installments_promo').maybeSingle(),
  ]);
  if (!dollar) {
    return NextResponse.json(
      { error: 'No pudimos calcular el precio en pesos. Probá en unos minutos o elegí otro medio de pago.' },
      { status: 503 }
    );
  }
  const promoOn = (promoRow.data?.value as { active?: boolean } | null)?.active === true;

  const created = await createOrder(supabase, { ...body, paymentMethod: 'card' }, {
    payment_details: {
      gateway: 'payway',
      sandbox: cfg.sandbox,
      status: 'processing',
      installments,
      multiplier: cardMultiplier(installments, promoOn),
      dollar_rate: dollar.rate,
      card_brand: CARD_BRAND_LABEL[brand],
      bin: card.bin,
      last_four: /^\d{4}$/.test(String(card.lastFour)) ? card.lastFour : null,
      billing,
    },
  });
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: created.status });
  }

  const orderId = created.order.id;
  const serverArs = cardTotalArs(created.subtotal, installments, promoOn, dollar.rate);

  // El precio cambió (dólar, promo o cupón): no se cobra, se muestra el nuevo
  if (!sameCharge(card.totalArs, serverArs)) {
    await discardOrder(supabase, orderId, created.couponCode);
    return NextResponse.json(
      {
        code: 'price_changed',
        error: 'El precio en pesos se actualizó. Revisá el nuevo total y tocá Pagar de nuevo.',
        quote: { dollarRate: dollar.rate, promoOn, totalArs: serverArs },
      },
      { status: 409 }
    );
  }

  // Se cobra exactamente lo que el cliente vio en pantalla
  const amountArs = Math.round(card.totalArs);
  const units = created.items.reduce((acc, it) => acc + it.quantity, 0);
  const result = await chargeCard({
    siteTransactionId: orderId,
    token: card.token,
    bin: card.bin,
    brand,
    amountArs,
    installments,
    customer: {
      id: (body.contact.document || '').replace(/\D/g, '').slice(0, 20) || 'invitado',
      email: body.contact.email.trim().toLowerCase(),
    },
    description: `Tkicks ${units} ${units === 1 ? 'producto' : 'productos'}`,
    fraud: {
      deviceId,
      pickup: body.fulfillment === 'pickup',
      contact: body.contact,
      billing,
      shipping: body.fulfillment === 'shipping' && body.address
        ? {
            street: [body.address.street, body.address.number].filter((x) => x?.trim()).join(' '),
            postalCode: body.address.postalCode,
            city: body.address.city,
            province: body.address.province,
          }
        : billing,
      items: created.items.map((it) => ({
        code: it.slug,
        sku: `${it.slug}-${it.size}`,
        name: it.title,
        description: `${it.title} talle ${it.size}`,
        quantity: it.quantity,
        weightUsd: it.price * it.quantity,
      })),
    },
  });

  // Sandbox: no se cobró nada de verdad, así que el pedido de prueba no queda
  // guardado ni retiene stock (si alguien dejara las claves de prueba en
  // producción, nadie se lleva un pedido "pagado" con la tarjeta de prueba)
  if (cfg.sandbox) {
    await discardOrder(supabase, orderId, created.couponCode);
    console.info(`[CARD] Sandbox: ${result.kind} (${'reason' in result ? result.reason : 'ok'})`);
    if (result.kind === 'rejected') {
      cardPaymentLimiter.recordFailedAttempt(clientIp);
      return NextResponse.json({ status: 'rejected', code: 'rejected', sandbox: true, error: result.message, reason: result.reason }, { status: 402 });
    }
    return NextResponse.json(
      { status: result.kind, sandbox: true, orderId: null, orderNumber: null, totalArs: amountArs, installments },
      { status: result.kind === 'approved' ? 200 : 202 }
    );
  }

  const details = (extra: Record<string, unknown>) => ({
    gateway: 'payway',
    sandbox: cfg.sandbox,
    installments,
    multiplier: cardMultiplier(installments, promoOn),
    dollar_rate: dollar.rate,
    amount_ars: amountArs,
    card_brand: CARD_BRAND_LABEL[brand],
    bin: card.bin,
    last_four: /^\d{4}$/.test(String(card.lastFour)) ? card.lastFour : null,
    billing,
    ...extra,
  });

  if (result.kind === 'approved') {
    // Pasar a "paid" le asigna el número de pedido (trigger en la base)
    const { data: paid, error } = await writeOrder(
      supabase,
      { status: 'paid', payment_status: 'validated', payment_details: details(paymentSummary(result.payment) ?? {}) },
      orderId
    );
    if (error) console.error(`[CARD] Cobrado pero no se pudo marcar el pedido ${orderId}:`, error);
    console.info(`[CARD] Aprobado: pedido ${orderId}, pago ${result.payment.id}, $${amountArs} en ${installments}`);
    cardPaymentLimiter.reset(clientIp);
    return NextResponse.json({
      status: 'approved',
      orderId,
      orderNumber: paid?.order_number ?? null,
      totalArs: amountArs,
      installments,
    });
  }

  if (result.kind === 'review') {
    await writeOrder(supabase, { payment_details: details(paymentSummary(result.payment) ?? {}) }, orderId);
    console.info(`[CARD] En revisión: pedido ${orderId}, pago ${result.payment.id}`);
    return NextResponse.json({ status: 'review', orderId, totalArs: amountArs, installments }, { status: 202 });
  }

  if (result.kind === 'unknown') {
    await writeOrder(supabase, { payment_details: details({ status: 'unknown', reason: result.reason }) }, orderId);
    console.error(`[CARD] Sin respuesta de Payway para el pedido ${orderId}: ${result.reason}`);
    return NextResponse.json({ status: 'unknown', orderId, totalArs: amountArs, installments }, { status: 202 });
  }

  // Rechazado: no se cobró nada, vuelve el stock
  console.warn(`[CARD] Rechazado: pedido ${orderId} (${result.reason})`);
  cardPaymentLimiter.recordFailedAttempt(clientIp);
  await discardOrder(supabase, orderId, created.couponCode);
  return NextResponse.json({ status: 'rejected', code: 'rejected', error: result.message, reason: result.reason }, { status: 402 });
}
