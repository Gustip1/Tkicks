"use client";
import Link from 'next/link';
import { useEffect, useId, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { useCartStore } from '@/store/cart';
import { useCheckoutStore, PaymentMethod } from '@/store/checkout';
import { formatARS, formatCurrency, cn } from '@/lib/utils';
import { useDolarRate } from '@/components/DolarRateProvider';
import { useInstallmentsPromo } from '@/components/InstallmentsPromoProvider';
import { getCardSurchargeRate } from '@/lib/promo';
import { trackEvent } from '@/lib/analytics/track';
import { PAYMENT_SCOPE_LABELS, paymentGroup } from '@/lib/coupons';
import { CardPayment, CardToken, ProvinceSelect } from '@/components/checkout/CardPayment';
import { TransferInstructions } from '@/components/checkout/TransferInstructions';
import { uploadProof } from '@/lib/images/prepareProof';
import { closeCheckoutLead, saveLead, waLink } from '@/lib/contact';
import { CardInstallments, cardTotalArs, cardTotalUsd, CARD_BRAND_LABEL, cardBrandOf, canonicalProvince, surchargeLabel } from '@/lib/payments/card';
import type { PaywayPublicConfig } from '@/lib/payments/payway';
import {
  MapPin,
  Truck,
  Store,
  CreditCard,
  Banknote,
  Bitcoin,
  ChevronRight,
  ChevronLeft,
  Upload,
  Check,
  Clock,
  ShieldCheck,
  ExternalLink,
  AlertCircle,
  Package,
} from 'lucide-react';

type Step = 1 | 2;

const WHATSAPP_NUMBER = '5492644802994';
const PAYMENT_ALIAS_ARS = 'tkicks.sj';
const PAYMENT_HOLDER = 'Gustavo Facundo Piñones Tello';
const PAYMENT_ALIAS_USD = 'gusti.dolares';
const CRYPTO_WALLET = '0x9f5e152b579263fbb2b88f976fa4bb4bbac21e20';

const CARD_BRANDS = ['Visa', 'Mastercard', 'American Express'] as const;
type CardBrand = (typeof CARD_BRANDS)[number];

/** Resultado del pago con tarjeta, para la pantalla final */
interface CardOutcome {
  status: 'approved' | 'review' | 'unknown';
  sandbox: boolean;
  totalArs: number;
  installments: CardInstallments;
  brand: string | null;
  lastFour: string;
  orderRef: string | null;
  /** Retira en el showroom (el checkout se limpia al terminar) */
  pickup: boolean;
}

export default function CheckoutClient({ payway }: { payway: PaywayPublicConfig | null }) {
  // Recupera los datos que el cliente ya había escrito (ver store/checkout.ts)
  useEffect(() => {
    useCheckoutStore.persist.rehydrate();
  }, []);

  // El carrito vive en el navegador y el servidor lo ve vacío: si el checkout
  // se dibujara igual en los dos, no coinciden y React tira la página entera y
  // la vuelve a pintar (un parpadeo justo donde se cierra la venta). Hasta
  // montar se muestra un esqueleto neutro, idéntico en servidor y navegador.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const router = useRouter();
  const supabase = createBrowserClient();
  const cart = useCartStore();
  const checkout = useCheckoutStore();
  const { rate: dolarOficial, ready: rateReady } = useDolarRate();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderComplete, setOrderComplete] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [completedPaymentMethod, setCompletedPaymentMethod] = useState<string | null>(null);
  // Marca de la tarjeta para cuotas: va en el WhatsApp así el link de pago se
  // arma de una, sin tener que preguntar
  const [cardBrand, setCardBrand] = useState<CardBrand | null>(null);
  const [cardBrandError, setCardBrandError] = useState(false);
  const [completedProofUploaded, setCompletedProofUploaded] = useState(false);
  // Transferencia: el pedido se confirma primero y recién después se muestran los datos para pagar
  const [completedTransfer, setCompletedTransfer] = useState<{ orderId: string; totalUsd: number; totalArs: number } | null>(null);
  // Identifica este checkout para guardar la "compra sin terminar" una sola vez y borrarla al pagar
  const checkoutRef = useRef<string>('');
  if (!checkoutRef.current && typeof window !== 'undefined') {
    try {
      checkoutRef.current = sessionStorage.getItem('tk-checkout-ref') || '';
      if (!checkoutRef.current) {
        checkoutRef.current = crypto.randomUUID();
        sessionStorage.setItem('tk-checkout-ref', checkoutRef.current);
      }
    } catch {
      checkoutRef.current = `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  }
  /** La compra terminó: se borra la "compra sin terminar" y el próximo checkout usa otra referencia */
  const finishCheckoutLead = () => {
    if (checkoutRef.current) closeCheckoutLead(checkoutRef.current);
    try {
      sessionStorage.removeItem('tk-checkout-ref');
    } catch {
      /* nada */
    }
    checkoutRef.current = '';
  };
  // Tarjeta con Payway: cuotas elegidas, error del cobro y resultado final
  const [cardInstallments, setCardInstallments] = useState<CardInstallments>(1);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardOutcome, setCardOutcome] = useState<CardOutcome | null>(null);
  // Si el servidor avisa que cambió el dólar o la promo, se usa su cotización
  const [cardQuote, setCardQuote] = useState<{ dollarRate: number; promoOn: boolean } | null>(null);

  // La pantalla final reemplaza al formulario: sin esto quedaba a la altura del
  // botón de pagar y en el celular no se veía el "Pago aprobado"
  useEffect(() => {
    if (orderComplete) window.scrollTo({ top: 0 });
  }, [orderComplete]);

  // Al cambiar de paso se vuelve arriba: el paso nuevo arrancaba a la altura
  // del botón "Continuar" y había que subir para ver de qué se trataba.
  const stepChanged = useRef(false);
  const lastStep = useRef(step);
  if (lastStep.current !== step) stepChanged.current = true;
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    window.scrollTo({ top: 0 });
  }, [step]);

  // En el checkout el carrito no vence: antes, a los 10 minutos se vaciaba y
  // mandaba a la persona al catálogo aunque estuviera cargando la tarjeta o
  // volviendo de la app del banco. Solo se respeta si ya llegó vencido.
  useEffect(() => {
    if (useCartStore.getState().checkExpiry()) {
      router.push('/productos');
      return;
    }
    useCartStore.getState().keepAlive();
    const interval = setInterval(() => useCartStore.getState().keepAlive(), 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Qué forma de pago mira cada persona: sirve para ver en cuál se van
  useEffect(() => {
    if (step === 2 && checkout.paymentMethod) {
      trackEvent('payment_method_selected', 'ecommerce', { method: checkout.paymentMethod });
    }
  }, [step, checkout.paymentMethod]);

  // Redirect if cart is empty
  // Espera a estar montado: en el primer dibujo React usa el carrito como lo ve
  // el servidor (vacío) y, sin esta guarda, mandaba afuera a quien sí tenía productos.
  useEffect(() => {
    if (mounted && cart.items.length === 0 && !orderComplete) {
      router.push('/productos');
    }
  }, [mounted, cart.items.length, orderComplete, router]);

  // Track: llegó al checkout con productos (una vez por visita a la página)
  const checkoutTrackedRef = useRef(false);
  useEffect(() => {
    if (cart.items.length > 0 && !checkoutTrackedRef.current) {
      checkoutTrackedRef.current = true;
      trackEvent('checkout_started', 'ecommerce', {
        items: cart.items.length,
        units: cart.items.reduce((acc, it) => acc + it.quantity, 0),
      });
    }
  }, [cart.items]);

  const subtotalUSD = useMemo(
    () => cart.items.reduce((acc, it) => acc + it.price * it.quantity, 0),
    [cart.items]
  );
  // Recargo en tarjeta: 10% normal, 0% cuando el admin activa la promo en /admin/ajustes.
  // installments_3 = link de pago por WhatsApp (sin Payway); card = Payway en la web
  const isCardPayment = checkout.paymentMethod === 'installments_3';
  const isPayway = checkout.paymentMethod === 'card' && !!payway;
  const { active: promoOn } = useInstallmentsPromo();
  const surchargeRate = getCardSurchargeRate(promoOn);
  const cardPromoOn = cardQuote?.promoOn ?? promoOn;
  const cardRate = cardQuote?.dollarRate ?? dolarOficial;

  // Con la promo activa, 3 cuotas cuestan lo mismo que 1 pago: se ofrece primero
  useEffect(() => {
    if (cardPromoOn) setCardInstallments(3);
  }, [cardPromoOn]);

  // ─── Cupón de descuento ───
  const [couponInput, setCouponInput] = useState('');
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  // El cupón que recibió en el popup queda escrito: solo le falta tocar "Aplicar"
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tk-cupon');
      if (saved) setCouponInput((current) => current || saved);
    } catch {
      /* sin almacenamiento: lo escribe a mano */
    }
  }, []);
  // Un cupón puede valer solo con transferencia/efectivo o solo con tarjeta: si
  // el medio elegido no corresponde, no descuenta (y no se manda con el pedido),
  // pero queda cargado por si cambia de medio de pago.
  const couponScope = checkout.appliedDiscount?.paymentScope ?? null;
  const chosenPaymentGroup = paymentGroup(checkout.paymentMethod);
  const couponBlocked = !!couponScope && !!chosenPaymentGroup && chosenPaymentGroup !== couponScope;
  const activeCouponCode = couponBlocked ? null : checkout.appliedDiscount?.code ?? null;
  const discountAmount = couponBlocked ? 0 : Math.min(checkout.appliedDiscount?.amount ?? 0, subtotalUSD);
  const discountedSubtotalUSD = subtotalUSD - discountAmount;

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponValidating(true);
    setCouponError(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          subtotal: subtotalUSD,
          // Con el carrito el servidor sabe a qué productos aplica (marca, categoría, ofertas)
          items: cart.items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
          email: checkout.contact.email || null,
          document: checkout.contact.document || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || 'No se pudo validar el cupón');
        checkout.setAppliedDiscount(null);
        return;
      }
      checkout.setAppliedDiscount({
        code: code.toUpperCase(),
        type: data.type,
        value: data.value,
        amount: data.discountAmount,
        paymentScope: data.paymentScope ?? null,
        headline: data.headline,
        partial: !!data.partial,
      });
    } catch {
      setCouponError('Error de conexión. Intentá de nuevo.');
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    checkout.setAppliedDiscount(null);
    setCouponInput('');
    setCouponError(null);
  };

  const totalUSD = isPayway
    ? cardTotalUsd(discountedSubtotalUSD, cardInstallments, cardPromoOn)
    : isCardPayment
      ? discountedSubtotalUSD * (1 + surchargeRate)
      : discountedSubtotalUSD;
  // Con Payway el monto en pesos sale de la misma cuenta que hace el servidor al cobrar
  const totalARS = isPayway
    ? cardTotalArs(discountedSubtotalUSD, cardInstallments, cardPromoOn, cardRate)
    : totalUSD * dolarOficial;
  // Qué líneas lleva el resumen: recargo, promo y valor de la cuota
  // El link por WhatsApp es siempre en 3 cuotas; con Payway, lo que eligió el cliente
  const installmentsCount = isCardPayment ? 3 : isPayway ? cardInstallments : 1;
  const inInstallments = installmentsCount > 1;
  const surchargePct = isPayway
    ? surchargeLabel(cardInstallments, cardPromoOn)
    : isCardPayment && !promoOn
      ? '10%'
      : null;
  const showSurcharge = inInstallments && !!surchargePct;
  const showPromo = installmentsCount === 3 && (isPayway ? cardPromoOn : isCardPayment && promoOn);

  // ─── Step 1 Validation ───
  const validateStep1 = useCallback((): boolean => {
    const e: Record<string, string> = {};

    if (checkout.fulfillment === 'shipping') {
      if (!checkout.contact.firstName.trim()) e.firstName = 'Nombre requerido';
      if (!checkout.contact.lastName.trim()) e.lastName = 'Apellido requerido';
      if (!checkout.contact.email.trim()) e.email = 'Email requerido';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkout.contact.email)) e.email = 'Email inválido';
      if (!checkout.contact.phone.trim()) e.phone = 'Teléfono requerido';
      if (!checkout.address.street.trim()) e.street = 'Dirección requerida';
      if (!checkout.address.postalCode.trim()) e.postalCode = 'Código postal requerido';
      if (!checkout.address.city.trim()) e.city = 'Localidad requerida';
      if (!canonicalProvince(checkout.address.province)) e.province = 'Elegí la provincia';
      if (!checkout.contact.document.trim()) e.document = 'DNI requerido';
    } else {
      // Pickup: todos los datos personales
      if (!checkout.contact.firstName.trim()) e.firstName = 'Nombre requerido';
      if (!checkout.contact.lastName.trim()) e.lastName = 'Apellido requerido';
      if (!checkout.contact.email.trim()) e.email = 'Email requerido';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkout.contact.email)) e.email = 'Email inválido';
      if (!checkout.contact.phone.trim()) e.phone = 'Teléfono requerido';
      if (!checkout.contact.document.trim()) e.document = 'DNI requerido';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [checkout]);

  const handleContinueToPayment = () => {
    if (validateStep1()) {
      setStep(2);
      trackEvent('checkout_payment_step', 'ecommerce', { total_usd: totalUSD, fulfillment: checkout.fulfillment });
      // Queda guardada como "compra sin terminar" en /admin/consultas; si paga, se borra sola.
      // Con el teléfono el dueño puede escribirle y ayudarla a terminar.
      const first = cart.items[0];
      if (first && checkout.contact.phone.trim()) {
        const lines = cart.items.map((it) => `• ${it.title} (talle ${it.size}) x${it.quantity}`).join('\n');
        void saveLead({
          kind: 'checkout',
          ref: checkoutRef.current || null,
          phone: checkout.contact.phone,
          name: `${checkout.contact.firstName} ${checkout.contact.lastName}`.trim(),
          product_slug: first.slug,
          product_title: cart.items.length > 1 ? `${first.title} y ${cart.items.length - 1} más` : first.title,
          size: cart.items.length === 1 ? first.size : null,
          message:
            `${lines}\nTotal: US$ ${discountedSubtotalUSD.toFixed(2)} (${formatARS(discountedSubtotalUSD * dolarOficial)})\n` +
            `${checkout.fulfillment === 'shipping' ? `Envío a ${checkout.address.city}, ${checkout.address.province}` : 'Retiro en showroom'}\n` +
            `Email: ${checkout.contact.email}`,
        });
      }
      return;
    }
    trackEvent('checkout_field_error', 'ecommerce', { step: 1 });
    // En el celular el error suele quedar fuera de pantalla y parecía que el
    // botón no hacía nada: se lleva al primer campo que falta y se enfoca.
    requestAnimationFrame(() => {
      const first = document.querySelector<HTMLInputElement>('[aria-invalid="true"]');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      first?.focus({ preventScroll: true });
    });
  };

  // ─── Submit Order ───
  const handleSubmitOrder = async () => {
    if (!checkout.paymentMethod) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map((it) => ({
            productId: it.productId,
            title: it.title,
            slug: it.slug,
            price: it.price,
            size: it.size,
            quantity: it.quantity,
          })),
          fulfillment: checkout.fulfillment,
          paymentMethod: checkout.paymentMethod,
          contact: checkout.contact,
          address: checkout.fulfillment === 'shipping' ? checkout.address : null,
          couponCode: activeCouponCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ submit: data.error || 'Error al procesar la orden' });
        trackEvent('order_error', 'ecommerce', { method: checkout.paymentMethod, status: res.status });
        setSubmitting(false);
        return;
      }

      const orderId = data.orderId;
      checkout.setOrderId(orderId);

      trackEvent('purchase', 'ecommerce', {
        order: data.orderNumber || orderId.slice(0, 8),
        total_usd: totalUSD,
        method: checkout.paymentMethod,
      });

      // Upload proof if provided (optional) — swallow errors so order success always shows
      if (checkout.paymentMethod === 'crypto_transfer' && proofFile) {
        await uploadProof(orderId, proofFile);
      }

      setCompletedOrderNumber(data.orderNumber || orderId.slice(0, 8));
      setCompletedPaymentMethod(checkout.paymentMethod);
      setCompletedProofUploaded(proofUploaded);
      if (checkout.paymentMethod === 'crypto_transfer') {
        setCompletedTransfer({ orderId, totalUsd: discountedSubtotalUSD, totalArs: discountedSubtotalUSD * dolarOficial });
      }
      finishCheckoutLead();
      setOrderComplete(true);
      cart.clear();
      checkout.reset();
    } catch (err) {
      setErrors({ submit: 'Error de conexión. Intentá de nuevo.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Installments: solo abre WhatsApp con el link de pago — no crea ninguna orden ───
  const handleInstallmentsWhatsApp = () => {
    if (!cardBrand) {
      setCardBrandError(true);
      document.getElementById('card-brand')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    try {
      trackEvent('installments_link_requested', 'ecommerce', {
        total_usd: totalUSD,
        method: 'installments_3',
        card_brand: cardBrand,
      });

      const waMessage =
        `¡Hola! Quiero pagar en *3 cuotas${promoOn ? ' sin interés' : ''}* con tarjeta de crédito.\n` +
        `💳 *Tarjeta:* ${cardBrand}\n\n` +
        `📦 *Productos:*\n${cart.items
          .map((it) => `• ${it.title} (Talle ${it.size}) x${it.quantity} — $${it.price.toFixed(2)} USD`)
          .join('\n')}\n\n` +
        `💰 *Subtotal (precio base):* $${subtotalUSD.toFixed(2)} USD\n` +
        (discountAmount > 0
          ? `🎟 *Cupón ${checkout.appliedDiscount?.code}:* -$${discountAmount.toFixed(2)} USD\n`
          : '') +
        (promoOn
          ? `🔥 *PROMO: SIN recargo*\n`
          : `➕ *Recargo tarjeta (10%):* +$${(discountedSubtotalUSD * surchargeRate).toFixed(2)} USD\n`) +
        `✅ *TOTAL A COBRAR:* $${totalUSD.toFixed(2)} USD (${formatCurrency(totalARS)})\n` +
        `💳 *3 cuotas de:* ${formatCurrency(totalARS / 3)}\n\n` +
        `👤 *Datos del comprador:*\n` +
        `Nombre: ${checkout.contact.firstName} ${checkout.contact.lastName}\n` +
        `DNI: ${checkout.contact.document}\n` +
        `Email: ${checkout.contact.email}\n` +
        `Teléfono: ${checkout.contact.phone}\n\n` +
        (checkout.fulfillment === 'shipping'
          ? `🚚 *Envío a domicilio:*\n` +
            `Dirección: ${checkout.address.street}\n` +
            `Localidad: ${checkout.address.city}\n` +
            `Provincia: ${checkout.address.province}\n` +
            `CP: ${checkout.address.postalCode}`
          : `🏪 *Retiro en Showroom*`);

      window.open(
        `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(waMessage)}`,
        '_blank'
      );

      setCompletedOrderNumber(null);
      setCompletedPaymentMethod('installments_3');
      setCompletedProofUploaded(false);
      finishCheckoutLead();
      setOrderComplete(true);
      cart.clear();
      checkout.reset();
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Tarjeta con Payway: el token ya está, el servidor reserva y cobra ───
  const handleCardToken = async (card: CardToken) => {
    if (submitting) return;
    setSubmitting(true);
    setCardError(null);
    const installments = cardInstallments;
    const shownArs = totalARS;
    try {
      const res = await fetch('/api/payments/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map((it) => ({
            productId: it.productId,
            title: it.title,
            slug: it.slug,
            price: it.price,
            size: it.size,
            quantity: it.quantity,
          })),
          fulfillment: checkout.fulfillment,
          paymentMethod: 'card',
          contact: checkout.contact,
          address: checkout.fulfillment === 'shipping' ? checkout.address : null,
          couponCode: activeCouponCode,
          card: { ...card, installments, totalArs: shownArs },
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (data?.code === 'price_changed' && data.quote) {
        setCardQuote({ dollarRate: data.quote.dollarRate, promoOn: data.quote.promoOn });
        setCardError(data.error);
        return;
      }

      if (data?.status === 'approved' || data?.status === 'review' || data?.status === 'unknown') {
        const brand = cardBrandOf(card.bin);
        if (data.status === 'approved' && !data.sandbox) {
          trackEvent('purchase', 'ecommerce', {
            order: data.orderNumber || String(data.orderId || '').slice(0, 8),
            total_usd: totalUSD,
            method: 'card',
            installments,
          });
        }
        setCardOutcome({
          status: data.status,
          sandbox: !!data.sandbox,
          totalArs: Number(data.totalArs) || shownArs,
          installments,
          brand: brand ? CARD_BRAND_LABEL[brand] : null,
          lastFour: card.lastFour,
          orderRef: data.orderNumber || (data.orderId ? String(data.orderId).slice(0, 8) : null),
          pickup: checkout.fulfillment === 'pickup',
        });
        setCompletedOrderNumber(data.orderNumber || null);
        setCompletedPaymentMethod('card');
        setCompletedProofUploaded(false);
        finishCheckoutLead();
        setOrderComplete(true);
        cart.clear();
        checkout.reset();
        return;
      }

      // Rechazado por el banco, stock que cambió o datos que faltan: el error va arriba del botón
      trackEvent('card_payment_failed', 'ecommerce', {
        installments,
        status: res.status,
        reason: typeof data?.reason === 'string' ? data.reason.slice(0, 80) : undefined,
      });
      setCardError(data?.error || 'No pudimos procesar el pago. Probá de nuevo o elegí otro medio de pago.');
    } catch {
      setCardError('Se cortó la conexión. Antes de volver a intentar, fijate si te llegó el aviso del banco o escribinos por WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Proof Upload ───
  const handleProofUpload = (file: File) => {
    setProofFile(file);
    setProofUploaded(true);
    setErrors((e) => {
      const { proof, ...rest } = e;
      return rest;
    });
  };

  if (!mounted) {
    return (
      <div className="max-w-5xl mx-auto py-6 md:py-10 space-y-4" aria-busy="true" aria-label="Cargando checkout">
        <div className="skeleton h-8 w-40 rounded" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="skeleton h-[420px] rounded-lg" />
          <div className="skeleton h-[260px] rounded-lg" />
        </div>
      </div>
    );
  }

  // ─── Pago con tarjeta terminado ───
  if (orderComplete && cardOutcome) {
    const o = cardOutcome;
    const approved = o.status === 'approved';
    const paidLine = `${formatCurrency(o.totalArs)}${o.installments > 1 ? ` en ${o.installments} cuotas de ${formatCurrency(o.totalArs / o.installments)}` : ' en 1 pago'}${o.brand ? ` con ${o.brand}` : ''}${o.lastFour ? ` terminada en ${o.lastFour}` : ''}`;
    const waText = encodeURIComponent(
      `Hola, pagué con tarjeta en la web y quiero confirmar el pago.${o.orderRef ? ` Pedido ${o.orderRef}.` : ''}`
    );
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-white px-4">
        <div className="success-enter max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mx-auto">
            {approved ? <DrawnCheck /> : <Clock className="w-10 h-10 text-white" />}
          </div>
          <h1 className="t-display text-gray-900">
            {o.sandbox && approved ? 'Pago de prueba aprobado.' : approved ? 'Pago aprobado.' : 'Estamos confirmando tu pago.'}
          </h1>
          <p className="text-gray-500 font-bold text-sm">
            {o.sandbox ? (
              'Modo de prueba de Payway: no se cobró nada y el pedido no se guardó.'
            ) : approved ? (
              <>
                {completedOrderNumber ? (
                  <>Tu pedido <span className="text-gray-900 font-black">{completedOrderNumber}</span> está confirmado. </>
                ) : (
                  'Tu pedido está confirmado. '
                )}
                Pagaste {paidLine}.
              </>
            ) : (
              'El banco todavía no nos confirmó el cobro. No lo intentes de nuevo: te escribimos apenas se acredite.'
            )}
          </p>
          {!o.sandbox && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-left space-y-2">
              <p className="text-xs text-gray-400 font-bold">Próximos pasos</p>
              <ul className="text-sm text-gray-600 space-y-1.5">
                {approved ? (
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" aria-hidden />
                    {o.pickup
                      ? 'Te contactamos para coordinar el retiro en el showroom'
                      : 'Te avisamos por WhatsApp o email cuando lo despachemos'}
                  </li>
                ) : (
                  <li className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" aria-hidden />
                    Tu pedido queda reservado mientras se confirma el pago
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" aria-hidden />
                  ¿Dudas? Escribinos por{' '}
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-900 font-black underline"
                  >
                    WhatsApp
                  </a>
                </li>
              </ul>
            </div>
          )}
          <button
            onClick={() => router.push('/productos')}
            className="w-full py-3 rounded-full bg-pricing text-white font-normal text-sm hover:bg-pricing-hover transition-colors"
          >
            Seguir comprando
          </button>
        </div>
      </div>
    );
  }

  // ─── Transferencia: pedido reservado, falta pagar ───
  if (orderComplete && completedTransfer) {
    return (
      <div className="bg-white px-4 py-8 md:py-14">
        <div className="success-enter mx-auto max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-900">
            <DrawnCheck />
          </div>
          <h1 className="t-display text-gray-900">Tu pedido está reservado.</h1>
          <p className="t-body text-gray-600">
            Pedido <span className="font-semibold text-gray-900">{completedOrderNumber}</span>. Para confirmarlo, transferí el
            total y mandanos el comprobante.
          </p>
          <TransferInstructions
            account={{
              aliasArs: PAYMENT_ALIAS_ARS,
              aliasUsd: PAYMENT_ALIAS_USD,
              holder: PAYMENT_HOLDER,
              cryptoWallet: CRYPTO_WALLET,
              whatsappNumber: WHATSAPP_NUMBER,
            }}
            orderId={completedTransfer.orderId}
            orderRef={completedOrderNumber || ''}
            totalUsd={completedTransfer.totalUsd}
            totalArs={completedTransfer.totalArs}
          />
          <Link href="/productos" className="link-apple inline-flex t-body">
            Seguir mirando
          </Link>
        </div>
      </div>
    );
  }

  // ─── Order Complete Screen ───
  if (orderComplete) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-white px-4">
        <div className="success-enter max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mx-auto">
            <DrawnCheck />
          </div>
          <h1 className="t-display text-gray-900">
            {completedPaymentMethod === 'installments_3' ? 'Listo.' : 'Pedido confirmado.'}
          </h1>
          <p className="text-gray-500 font-bold text-sm">
            {completedPaymentMethod === 'installments_3' ? (
              'Te enviamos tu pedido por WhatsApp para coordinar el link de pago con tarjeta.'
            ) : (
              <>Tu orden <span className="text-gray-900 font-black">{completedOrderNumber}</span> fue registrada con éxito.</>
            )}
          </p>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-left space-y-2">
            <p className="text-xs text-gray-400 font-bold ">Próximos pasos</p>
            <ul className="text-sm text-gray-600 space-y-1.5">
              {completedPaymentMethod === 'crypto_transfer' && !completedProofUploaded && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-900 mt-0.5">!</span>
                  Envianos el comprobante de transferencia por WhatsApp al{' '}
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="text-gray-900 font-black underline">
                    WhatsApp
                  </a>
                </li>
              )}
              {completedPaymentMethod === 'crypto_transfer' && completedProofUploaded && (
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" aria-hidden />
                  Comprobante recibido. Lo validamos a la brevedad.
                </li>
              )}
              {completedPaymentMethod === 'installments_3' && (
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" aria-hidden />
                  El equipo de Tkicks te enviará el link de pago con tarjeta por WhatsApp
                </li>
              )}
              {completedPaymentMethod === 'cash' && (
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" aria-hidden />
                  Te contactaremos para coordinar el retiro en showroom
                </li>
              )}
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" aria-hidden />
                Recibirás actualizaciones por WhatsApp o email
              </li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push('/productos')}
              className="flex-1 py-3 rounded-full bg-pricing text-white font-normal text-sm hover:bg-pricing-hover transition-colors"
            >
              Seguir comprando
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="t-display text-gray-900">Finalizar compra</h1>
          {/* Step indicator */}
          <div className="mt-4 flex items-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black transition-colors ${
              step >= 1 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              <span className="w-5 h-5 rounded-full bg-white text-gray-900 text-xs flex items-center justify-center font-black">1</span>
              Entrega
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black transition-colors ${
              step >= 2 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-black ${
                step >= 2 ? 'bg-white text-gray-900' : 'bg-gray-200 text-gray-500'
              }`}>2</span>
              Pago
            </div>
          </div>
        </div>

        {/* Celular: qué estás comprando y cuánto, arriba. El resumen completo queda al final. */}
        <details className="faq-item group mb-6 rounded-2xl bg-[#f5f5f7] px-4 lg:hidden">
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2.5">
              {cart.items[0]?.imageUrl && (
                <img src={cart.items[0].imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain" />
              )}
              <span className="truncate text-[15px] text-gray-900">
                {cart.items.reduce((n, it) => n + it.quantity, 0) === 1 ? '1 producto' : `${cart.items.reduce((n, it) => n + it.quantity, 0)} productos`}
                <span className="text-gray-500"> · Envío gratis</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-[17px] font-semibold text-gray-900 tabular-nums">
              {formatARS(totalARS)}
              <ChevronRight className="h-4 w-4 text-gray-500 transition-transform duration-200 group-open:rotate-90" aria-hidden />
            </span>
          </summary>
          <ul className="space-y-2.5 border-t border-[#d6d6d6] py-3.5">
            {cart.items.map((it) => (
              <li key={`${it.productId}-${it.size}`} className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate text-gray-900">
                  {it.title} <span className="text-gray-500">· Talle {it.size}{it.quantity > 1 ? ` · x${it.quantity}` : ''}</span>
                </span>
                <span className="shrink-0 text-gray-700 tabular-nums">US$ {(it.price * it.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </details>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Main content — al cambiar de paso entra de nuevo */}
          <div key={step} className={`space-y-6 ${stepChanged.current ? 'step-enter' : ''}`}>
            {/* ═══════════════ STEP 1: DELIVERY ═══════════════ */}
            {step === 1 && (
              <>
                {/* Delivery method selector */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-5">
                  <h2 className="t-tagline flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Método de entrega
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => checkout.setFulfillment('pickup')}
                      className={`relative flex items-center gap-3 p-4 rounded-lg border transition-[box-shadow,border-color] duration-150 ${
                        checkout.fulfillment === 'pickup'
                          ? 'border-transparent bg-white ring-2 ring-primary-hover'
                          : 'border-gray-200 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        checkout.fulfillment === 'pickup' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900">Retiro en Showroom</p>
                        <p className="text-xs text-gray-400 font-bold">Gratis · San Juan</p>
                      </div>
                      {checkout.fulfillment === 'pickup' && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => checkout.setFulfillment('shipping')}
                      className={`relative flex items-center gap-3 p-4 rounded-lg border transition-[box-shadow,border-color] duration-150 ${
                        checkout.fulfillment === 'shipping'
                          ? 'border-transparent bg-white ring-2 ring-primary-hover'
                          : 'border-gray-200 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        checkout.fulfillment === 'shipping' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900">Envío a domicilio</p>
                        <p className="text-xs text-gray-500 font-bold">100% Gratis</p>
                      </div>
                      {checkout.fulfillment === 'shipping' && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Contact info & shipping address */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-5">
                  <h2 className="t-tagline flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {checkout.fulfillment === 'shipping' ? 'Datos de envío' : 'Datos de contacto'}
                  </h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Nombre y Apellido */}
                    <InputField label="Nombre *" value={checkout.contact.firstName} error={errors.firstName}
                      autoComplete="given-name" inputMode="text"
                      onChange={(v) => checkout.updateContact({ firstName: v })} />
                    <InputField label="Apellido *" value={checkout.contact.lastName} error={errors.lastName}
                      autoComplete="family-name" inputMode="text"
                      onChange={(v) => checkout.updateContact({ lastName: v })} />

                    {/* Email y Teléfono */}
                    <InputField label="Email *" type="email" value={checkout.contact.email} error={errors.email}
                      autoComplete="email" inputMode="email"
                      onChange={(v) => checkout.updateContact({ email: v })} />
                    <InputField label="Teléfono *" type="tel" value={checkout.contact.phone} error={errors.phone}
                      autoComplete="tel" inputMode="tel"
                      onChange={(v) => checkout.updateContact({ phone: v })} />

                    {/* DNI — requerido siempre */}
                    <InputField label="DNI *" value={checkout.contact.document} error={errors.document}
                      autoComplete="off" inputMode="numeric"
                      onChange={(v) => checkout.updateContact({ document: v })} placeholder="Ej: 38123456" />

                    {/* Campos de envío */}
                    {checkout.fulfillment === 'shipping' && (
                      <>
                        <div className="sm:col-span-2">
                          <InputField label="Dirección *" value={checkout.address.street} error={errors.street}
                            autoComplete="street-address" inputMode="text"
                            onChange={(v) => checkout.updateAddress({ street: v })} placeholder="Ej: Av. Libertador 1234, Piso 3 Dto B" />
                        </div>
                        <InputField label="Código Postal *" value={checkout.address.postalCode} error={errors.postalCode}
                          autoComplete="postal-code" inputMode="numeric"
                          onChange={(v) => checkout.updateAddress({ postalCode: v })} placeholder="Ej: 5400" />
                        <InputField label="Localidad *" value={checkout.address.city} error={errors.city}
                          autoComplete="address-level2" inputMode="text"
                          onChange={(v) => checkout.updateAddress({ city: v })} placeholder="Ej: San Juan" />
                        <div className="sm:col-span-2">
                          <ProvinceSelect label="Provincia *" value={checkout.address.province} error={errors.province}
                            autoComplete="address-level1"
                            onChange={(v) => checkout.updateAddress({ province: v })} />
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleContinueToPayment}
                    className="w-full py-3.5 rounded-full bg-pricing text-white font-normal text-sm hover:bg-pricing-hover transition-colors flex items-center justify-center gap-2"
                  >
                    Continuar al pago
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* ═══════════════ STEP 2: PAYMENT ═══════════════ */}
            {step === 2 && (
              <>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-900 font-bold transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Volver a entrega
                </button>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-5">
                  <h2 className="t-tagline flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Método de pago
                  </h2>

                  <div className="space-y-3">
                    {/* Option A: Cash — ONLY for pickup */}
                    {checkout.fulfillment === 'pickup' && (
                      <PaymentOption
                        selected={checkout.paymentMethod === 'cash'}
                        onClick={() => checkout.setPaymentMethod('cash')}
                        icon={<Banknote className="w-5 h-5" />}
                        title="Efectivo"
                        description="Pagá al retirar en el showroom"
                      />
                    )}

                    {/* Option B: Crypto / Transfer */}
                    <PaymentOption
                      selected={checkout.paymentMethod === 'crypto_transfer'}
                      onClick={() => checkout.setPaymentMethod('crypto_transfer')}
                      icon={<Bitcoin className="w-5 h-5" />}
                      title="Transferencia / Cripto"
                      description="Transferencia bancaria o pago con criptomonedas"
                    />

                    {/* Option C: tarjeta en la web con Payway, o el link por WhatsApp si no está configurado */}
                    {payway ? (
                      <PaymentOption
                        selected={checkout.paymentMethod === 'card'}
                        onClick={() => {
                          checkout.setPaymentMethod('card');
                          setCardError(null);
                        }}
                        icon={<CreditCard className="w-5 h-5" />}
                        title="Tarjeta de crédito"
                        description={
                          cardPromoOn
                            ? 'En 1 pago, 3 cuotas sin interés o 6 cuotas'
                            : 'En 1 pago sin recargo, o en 3 o 6 cuotas con recargo'
                        }
                      />
                    ) : (
                    <PaymentOption
                      selected={checkout.paymentMethod === 'installments_3'}
                      onClick={() => checkout.setPaymentMethod('installments_3')}
                      icon={<CreditCard className="w-5 h-5" />}
                      title={
                        promoOn
                          ? '3 cuotas sin interés con tarjeta'
                          : '3 cuotas con tarjeta (10% de recargo)'
                      }
                      description={
                        promoOn
                          ? 'Promo activa: mismo precio que efectivo. Te mandamos el link de pago por WhatsApp.'
                          : '10% de recargo sobre el precio base · Link de pago por WhatsApp'
                      }
                    />
                    )}
                  </div>
                </div>

                {/* Tarjeta de crédito con Payway */}
                {isPayway && payway && (
                  <div className="step-enter rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
                    <CardPayment
                      config={payway}
                      subtotalUsd={discountedSubtotalUSD}
                      installments={cardInstallments}
                      onInstallmentsChange={(n) => {
                        setCardInstallments(n);
                        setCardError(null);
                      }}
                      promoOn={cardPromoOn}
                      dollarRate={cardRate}
                      rateReady={rateReady || !!cardQuote}
                      defaultName={`${checkout.contact.firstName} ${checkout.contact.lastName}`.trim()}
                      defaultDocument={checkout.contact.document.replace(/\D/g, '')}
                      shippingAddress={
                        checkout.fulfillment === 'shipping'
                          ? {
                              street: [checkout.address.street, checkout.address.number].filter((x) => x.trim()).join(' '),
                              postalCode: checkout.address.postalCode,
                              city: checkout.address.city,
                              province: checkout.address.province,
                            }
                          : null
                      }
                      submitting={submitting}
                      error={cardError}
                      onToken={handleCardToken}
                    />
                  </div>
                )}

                {/* Payment details panel */}
                {checkout.paymentMethod === 'cash' && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Banknote className="w-5 h-5 text-gray-900" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Pago en efectivo</p>
                        <p className="text-xs text-gray-400 font-bold">Aboná al momento de retirar en nuestro showroom</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-xs text-gray-500 font-bold">
                        Tu pedido queda reservado. Te mandamos la dirección exacta por email.
                      </p>
                    </div>
                  </div>
                )}

                {checkout.paymentMethod === 'crypto_transfer' && (
                  <div className="step-enter rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-4">
                    <h3 className="t-tagline text-gray-900">Pagás por transferencia</h3>
                    <div className="rounded-2xl bg-[#f5f5f7] p-4">
                      <p className="text-[13px] text-gray-500">Total a transferir</p>
                      <p className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-gray-900 tabular-nums">
                        {formatARS(discountedSubtotalUSD * dolarOficial)}
                      </p>
                      <p className="text-[14px] text-gray-500 tabular-nums">US$ {discountedSubtotalUSD.toFixed(2)} · también en dólares o USDT</p>
                    </div>
                    {/* Primero queda el pedido, después se paga: así no se pierde si sale a la app del banco */}
                    <ol className="space-y-2.5 text-[15px] text-gray-700">
                      <li className="flex gap-3"><span className="font-semibold text-gray-900">1.</span>Confirmás el pedido y queda reservado a tu nombre.</li>
                      <li className="flex gap-3"><span className="font-semibold text-gray-900">2.</span>Te mostramos el alias y el monto para copiar.</li>
                      <li className="flex gap-3"><span className="font-semibold text-gray-900">3.</span>Transferís y nos mandás el comprobante.</li>
                    </ol>
                  </div>
                )}

                {checkout.paymentMethod === 'installments_3' && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-gray-900" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">
                          {promoOn ? '3 cuotas sin interés' : '3 cuotas con tarjeta'}
                          {promoOn && (
                            <span className="ml-2 inline-flex px-1.5 py-0.5 rounded bg-gray-900 text-white text-xs font-black align-middle">
                              Promo
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 font-bold">
                          {promoOn
                            ? 'Promo: SIN recargo, mismo precio que efectivo'
                            : 'Se aplica un 10% de recargo sobre el precio base'}
                        </p>
                      </div>
                    </div>

                    {/* Marca de la tarjeta: obligatoria, viaja en el mensaje de WhatsApp */}
                    <fieldset id="card-brand" className="scroll-mt-24">
                      <legend className="text-sm font-black text-gray-900">¿Con qué tarjeta vas a pagar?</legend>
                      <div role="radiogroup" aria-label="Tarjeta de crédito" className="mt-2.5 grid grid-cols-3 gap-2">
                        {CARD_BRANDS.map((b) => (
                          <button
                            key={b}
                            type="button"
                            role="radio"
                            aria-checked={cardBrand === b}
                            onClick={() => {
                              setCardBrand(b);
                              setCardBrandError(false);
                            }}
                            className={cn(
                              'min-h-[48px] rounded-xl border px-2 text-[14px] leading-tight transition-[border-color,box-shadow,color] duration-150 active:scale-[0.98]',
                              cardBrand === b
                                ? 'border-transparent bg-white font-semibold text-gray-900 ring-2 ring-primary'
                                : cardBrandError
                                  ? 'border-red-300 bg-white text-gray-900'
                                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-400'
                            )}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                      {cardBrandError && (
                        <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600">
                          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                          Elegí la tarjeta para que te mandemos el link de pago.
                        </p>
                      )}
                    </fieldset>

                    {/* Surcharge breakdown */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-bold">Subtotal (precio base)</span>
                        <span className="text-gray-900 font-bold">${subtotalUSD.toFixed(2)} USD</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-900 font-bold">Cupón {checkout.appliedDiscount?.code}</span>
                          <span className="text-gray-900 font-bold">-${discountAmount.toFixed(2)} USD</span>
                        </div>
                      )}
                      {!promoOn && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 font-bold">Recargo tarjeta (10%)</span>
                          <span className="text-gray-700 font-bold">+${(discountedSubtotalUSD * surchargeRate).toFixed(2)} USD</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="text-gray-900 font-black">Total con tarjeta</span>
                        <div className="text-right">
                          <p className="text-gray-900 font-black">${totalUSD.toFixed(2)} USD</p>
                          <p className="text-xs text-gray-500 font-bold">{formatCurrency(totalARS)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-900 font-black">3 cuotas de</span>
                        <span className="text-gray-900 font-black">{formatCurrency(totalARS / 3)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleInstallmentsWhatsApp}
                      disabled={submitting}
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-pricing text-white font-normal text-sm hover:bg-pricing-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          Confirmar y abrir WhatsApp
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Submit error */}
                {errors.submit && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-600 font-bold">{errors.submit}</p>
                  </div>
                )}

                {/* Confirm button */}
                {checkout.paymentMethod && checkout.paymentMethod !== 'installments_3' && checkout.paymentMethod !== 'card' && (
                  <button
                    onClick={handleSubmitOrder}
                    disabled={submitting}
                    className="w-full py-4 rounded-full bg-pricing text-white font-normal text-sm hover:bg-pricing-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        {checkout.paymentMethod === 'crypto_transfer' ? 'Confirmar pedido y ver datos de pago' : 'Confirmar pedido'}
                      </>
                    )}
                  </button>
                )}
              </>
            )}
            <div className="lg:hidden">
              <CheckoutHelp />
            </div>
          </div>

          {/* ═══════════════ ORDER SUMMARY SIDEBAR ═══════════════ */}
          <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
              <h3 className="t-tagline text-gray-900">Resumen del pedido</h3>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {cart.items.map((it) => (
                  <div key={`${it.productId}-${it.size}`} className="flex gap-3">
                    <div className="relative shrink-0">
                      {it.imageUrl && (
                        <img src={it.imageUrl} alt={it.title} className="w-14 h-14 rounded-lg object-contain bg-gray-50 border border-gray-200" />
                      )}
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white text-xs font-black flex items-center justify-center">
                        {it.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 line-clamp-1">{it.title}</p>
                      <p className="text-xs text-gray-400 font-bold">Talle: {it.size}</p>
                    </div>
                    <p className="text-xs font-black text-gray-900 whitespace-nowrap">
                      ${(it.price * it.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Cupón de descuento */}
              <div className="border-t border-gray-200 pt-3">
                {checkout.appliedDiscount ? (
                  <div className="space-y-1.5">
                    <div className={cn('flex items-center justify-between gap-2 rounded-lg px-3 py-2', couponBlocked ? 'bg-gray-100' : 'bg-gray-900')}>
                      <span className={cn('min-w-0 text-xs font-black', couponBlocked ? 'text-gray-500' : 'text-white')}>
                        Cupón {checkout.appliedDiscount.code} {couponBlocked ? 'sin aplicar' : 'aplicado'}
                      </span>
                      <button
                        onClick={handleRemoveCoupon}
                        className={cn('-my-2 shrink-0 py-2 text-xs font-bold underline', couponBlocked ? 'text-gray-700' : 'text-white hover:text-gray-300')}
                      >
                        Quitar
                      </button>
                    </div>
                    {couponBlocked && couponScope ? (
                      <p role="status" className="text-xs font-bold text-red-600">
                        Este cupón vale solo pagando con {PAYMENT_SCOPE_LABELS[couponScope]}. Con el medio de pago que elegiste no descuenta.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        {checkout.appliedDiscount.headline}
                        {checkout.appliedDiscount.partial ? ' en los productos que participan' : ''}
                        {couponScope ? ` · pagando con ${PAYMENT_SCOPE_LABELS[couponScope]}` : ''}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="¿Tenés un cupón?"
                        aria-label="Cupón de descuento"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        enterKeyHint="done"
                        className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-900"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponValidating || !couponInput.trim()}
                        className="min-h-[44px] shrink-0 px-4 py-2 rounded-full bg-pricing text-white text-[14px] font-normal hover:bg-pricing-hover disabled:opacity-50 transition-colors"
                      >
                        {couponValidating ? '...' : 'Aplicar'}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-500 font-bold">{couponError}</p>}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold">Subtotal</span>
                  <span className="text-gray-900 font-black">${subtotalUSD.toFixed(2)} USD</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900 font-bold">Cupón {checkout.appliedDiscount?.code}</span>
                    <span className="text-gray-900 font-black">-${discountAmount.toFixed(2)} USD</span>
                  </div>
                )}
                {showSurcharge && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-bold">Recargo {installmentsCount} cuotas ({surchargePct})</span>
                    <span className="text-gray-700 font-black">+${(totalUSD - discountedSubtotalUSD).toFixed(2)} USD</span>
                  </div>
                )}
                {showPromo && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900 font-semibold">Promo activa · sin recargo</span>
                    <span className="text-gray-900 font-black">$0.00 USD</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold">Envío</span>
                  <span className="text-gray-500 font-bold">Gratis</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-gray-200">
                  <span className="text-gray-900 font-black ">Total</span>
                  <div className="text-right">
                    <p className="text-gray-900 font-black">${totalUSD.toFixed(2)} USD</p>
                    <p className="text-gray-900 font-black tabular-nums">{formatARS(totalARS)}</p>
                  </div>
                </div>
                {inInstallments && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900 font-black">{installmentsCount} cuotas de</span>
                    <span className="text-gray-900 font-black">{formatCurrency(totalARS / installmentsCount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ayuda a mano: en el checkout no está el botón flotante de WhatsApp */}
            <CheckoutHelp />

            {/* Security badges */}
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ShieldCheck className="w-4 h-4 text-gray-900" />
                <span className="font-bold">Compra 100% segura</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Package className="w-4 h-4 text-gray-900" />
                <span className="font-bold">Productos originales garantizados</span>
              </div>
              <p className="pt-1 text-xs leading-relaxed text-gray-500">
                Las ventas son finales: los productos exclusivos no tienen cambio ni devolución. Al comprar aceptás los{' '}
                <Link href="/terminos" target="_blank" className="text-primary underline">
                  Términos y condiciones
                </Link>{' '}
                y la{' '}
                <Link href="/privacidad" target="_blank" className="text-primary underline">
                  Política de privacidad
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable Components ─── */

/** "¿Te trabaste?": salida a WhatsApp para quien duda justo antes de pagar */
function CheckoutHelp() {
  return (
    <a
      href={waLink('Hola! Estoy por comprar en la web y tengo una duda.')}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent('whatsapp_click', 'contact', { source: 'checkout' })}
      className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3 transition-transform duration-150 active:scale-[0.98]"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-gray-900">¿Tenés una duda antes de pagar?</span>
        <span className="block text-[13px] text-gray-500">Escribinos por WhatsApp y te ayudamos a terminar la compra.</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
    </a>
  );
}

/** Tilde que se dibuja al confirmar la compra */
function DrawnCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path className="check-draw" pathLength={1} d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function InputField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  required = true,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal' | 'search' | 'url' | 'none';
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-semibold text-gray-600 mb-1.5">{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className={`w-full rounded-md border bg-white px-4 py-3 text-[17px] text-gray-900 placeholder:text-gray-400 focus:outline-none transition-colors ${
          error ? 'border-red-500' : 'border-gray-200 focus:border-primary'
        }`}
      />
      <p id={`${id}-error`} className={`mt-1 text-xs text-red-600 min-h-[1rem] ${error ? '' : 'invisible'}`}>{error || ' '}</p>
    </div>
  );
}

function PaymentOption({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full flex items-center gap-4 p-4 rounded-xl border-2 transition text-left ${
        selected
          ? 'border-transparent bg-white ring-2 ring-primary-hover'
          : 'border-gray-200 bg-white hover:border-gray-400'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        selected ? 'bg-pricing text-white' : 'bg-gray-100 text-gray-600'
      }`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-black text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 font-bold">{description}</p>
      </div>
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </button>
  );
}
