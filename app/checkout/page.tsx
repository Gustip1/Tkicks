"use client";
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { useCartStore } from '@/store/cart';
import { useCheckoutStore, PaymentMethod } from '@/store/checkout';
import { formatCurrency } from '@/lib/utils';
import { useDolarRate } from '@/components/DolarRateProvider';
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
const PAYMENT_ALIAS_ARS = 'gusti.naranjax';
const PAYMENT_ALIAS_USD = 'gusti.dolares';
const CRYPTO_WALLET = 'Not yet...'; // Replace with real wallet

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const cart = useCartStore();
  const checkout = useCheckoutStore();
  const { rate: dolarOficial } = useDolarRate();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderComplete, setOrderComplete] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);

  // Check cart expiry
  useEffect(() => {
    const interval = setInterval(() => {
      if (cart.checkExpiry()) {
        router.push('/productos');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cart, router]);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.items.length === 0 && !orderComplete) {
      router.push('/productos');
    }
  }, [cart.items.length, orderComplete, router]);

  const subtotalUSD = useMemo(
    () => cart.items.reduce((acc, it) => acc + it.price * it.quantity, 0),
    [cart.items]
  );
  const subtotalARS = subtotalUSD * dolarOficial;

  // ─── Step 1 Validation ───
  const validateStep1 = useCallback((): boolean => {
    const e: Record<string, string> = {};

    if (checkout.fulfillment === 'shipping') {
      if (!checkout.contact.firstName.trim()) e.firstName = 'Nombre requerido';
      if (!checkout.contact.lastName.trim()) e.lastName = 'Apellido requerido';
      if (!checkout.contact.email.trim()) e.email = 'Email requerido';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkout.contact.email)) e.email = 'Email inválido';
      if (!checkout.contact.phone.trim()) e.phone = 'Teléfono requerido';
      if (!checkout.contact.document.trim()) e.document = 'Documento requerido';
      if (!checkout.address.postalCode.trim()) e.postalCode = 'Código postal requerido';
      if (!checkout.address.street.trim()) e.street = 'Dirección requerida';
    } else {
      // Pickup: minimal info
      if (!checkout.contact.firstName.trim()) e.firstName = 'Nombre requerido';
      if (!checkout.contact.email.trim()) e.email = 'Email requerido';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkout.contact.email)) e.email = 'Email inválido';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [checkout]);

  const handleContinueToPayment = () => {
    if (validateStep1()) setStep(2);
  };

  // ─── Submit Order ───
  const handleSubmitOrder = async () => {
    if (!checkout.paymentMethod) return;

    // For crypto/transfer, proof is mandatory
    if (checkout.paymentMethod === 'crypto_transfer' && !proofUploaded) {
      setErrors({ proof: 'Debés subir el comprobante de pago' });
      return;
    }

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ submit: data.error || 'Error al procesar la orden' });
        setSubmitting(false);
        return;
      }

      const orderId = data.orderId;
      checkout.setOrderId(orderId);

      // Upload proof if exists
      if (checkout.paymentMethod === 'crypto_transfer' && proofFile) {
        const fd = new FormData();
        fd.append('file', proofFile);
        fd.append('order_id', orderId);
        await fetch('/api/upload-proof', { method: 'POST', body: fd });
      }

      setCompletedOrderNumber(data.orderNumber || orderId.slice(0, 8));
      setOrderComplete(true);
      cart.clear();
      checkout.reset();
    } catch (err) {
      setErrors({ submit: 'Error de conexión. Intentá de nuevo.' });
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

  // ─── Order Complete Screen ───
  if (orderComplete) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-black px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-black text-white">¡Orden confirmada!</h1>
          <p className="text-gray-400 font-bold text-sm">
            Tu orden <span className="text-white font-black">{completedOrderNumber}</span> fue registrada con éxito.
            Te notificaremos cuando validemos el pago.
          </p>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 text-left space-y-2">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Próximos pasos</p>
            <ul className="text-sm text-gray-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                Validaremos tu comprobante de pago
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                Recibirás una notificación con el tracking
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                Podés seguir tu pedido en <span className="text-white font-black">/track</span>
              </li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push('/track')}
              className="flex-1 py-3 rounded-xl bg-white text-black font-black text-sm uppercase tracking-tight hover:bg-gray-100 transition-colors"
            >
              Seguir mi pedido
            </button>
            <button
              onClick={() => router.push('/productos')}
              className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-black text-sm uppercase tracking-tight hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              Seguir comprando
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Checkout</h1>
          {/* Step indicator */}
          <div className="mt-4 flex items-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black transition-colors ${
              step >= 1 ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-500'
            }`}>
              <span className="w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center font-black">1</span>
              Entrega
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black transition-colors ${
              step >= 2 ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-500'
            }`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-black ${
                step >= 2 ? 'bg-black text-white' : 'bg-zinc-700 text-zinc-400'
              }`}>2</span>
              Pago
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
          {/* Main content */}
          <div className="space-y-6">
            {/* ═══════════════ STEP 1: DELIVERY ═══════════════ */}
            {step === 1 && (
              <>
                {/* Delivery method selector */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-6 space-y-5">
                  <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Método de entrega
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => checkout.setFulfillment('pickup')}
                      className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        checkout.fulfillment === 'pickup'
                          ? 'border-white bg-white/5'
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        checkout.fulfillment === 'pickup' ? 'bg-white text-black' : 'bg-zinc-800 text-white'
                      }`}>
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-white">Retiro en Showroom</p>
                        <p className="text-xs text-gray-400 font-bold">Gratis · San Juan</p>
                      </div>
                      {checkout.fulfillment === 'pickup' && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => checkout.setFulfillment('shipping')}
                      className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        checkout.fulfillment === 'shipping'
                          ? 'border-white bg-white/5'
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        checkout.fulfillment === 'shipping' ? 'bg-white text-black' : 'bg-zinc-800 text-white'
                      }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-white">Envío a domicilio</p>
                        <p className="text-xs text-gray-400 font-bold">Coordinaremos el costo</p>
                      </div>
                      {checkout.fulfillment === 'shipping' && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Contact info & shipping address */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-6 space-y-5">
                  <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {checkout.fulfillment === 'shipping' ? 'Datos de envío' : 'Datos de contacto'}
                  </h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputField label="Nombre *" value={checkout.contact.firstName} error={errors.firstName}
                      onChange={(v) => checkout.updateContact({ firstName: v })} />
                    <InputField label="Apellido" value={checkout.contact.lastName} error={errors.lastName}
                      onChange={(v) => checkout.updateContact({ lastName: v })}
                      required={checkout.fulfillment === 'shipping'} />
                    <InputField label="Email *" type="email" value={checkout.contact.email} error={errors.email}
                      onChange={(v) => checkout.updateContact({ email: v })} />
                    {checkout.fulfillment === 'shipping' && (
                      <>
                        <InputField label="Teléfono *" type="tel" value={checkout.contact.phone} error={errors.phone}
                          onChange={(v) => checkout.updateContact({ phone: v })} />
                        <InputField label="Documento (DNI/CUIT) *" value={checkout.contact.document} error={errors.document}
                          onChange={(v) => checkout.updateContact({ document: v })} />
                        <InputField label="Código Postal *" value={checkout.address.postalCode} error={errors.postalCode}
                          onChange={(v) => checkout.updateAddress({ postalCode: v })} />
                        <div className="sm:col-span-2">
                          <InputField label="Dirección de entrega *" value={checkout.address.street} error={errors.street}
                            onChange={(v) => checkout.updateAddress({ street: v })} placeholder="Ej: Av. Libertador 1234" />
                        </div>
                        <InputField label="Número" value={checkout.address.number}
                          onChange={(v) => checkout.updateAddress({ number: v })} />
                        <InputField label="Piso/Depto" value={checkout.address.unit}
                          onChange={(v) => checkout.updateAddress({ unit: v })} />
                        <InputField label="Ciudad" value={checkout.address.city}
                          onChange={(v) => checkout.updateAddress({ city: v })} />
                        <InputField label="Provincia" value={checkout.address.province}
                          onChange={(v) => checkout.updateAddress({ province: v })} />
                        <div className="sm:col-span-2">
                          <InputField label="Observaciones (opcional)" value={checkout.address.notes}
                            onChange={(v) => checkout.updateAddress({ notes: v })} />
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleContinueToPayment}
                    className="w-full py-3.5 rounded-xl bg-white text-black font-black text-sm uppercase tracking-tight hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
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
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white font-bold transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Volver a entrega
                </button>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-6 space-y-5">
                  <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
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

                    {/* Option C: 3 Cuotas sin interés */}
                    <PaymentOption
                      selected={checkout.paymentMethod === 'installments_3'}
                      onClick={() => checkout.setPaymentMethod('installments_3')}
                      icon={<CreditCard className="w-5 h-5" />}
                      title="3 Cuotas sin interés"
                      description="Coordinamos por WhatsApp con link de pago"
                    />
                  </div>
                </div>

                {/* Payment details panel */}
                {checkout.paymentMethod === 'cash' && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Banknote className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">Pago en efectivo</p>
                        <p className="text-xs text-gray-400 font-bold">Aboná al momento de retirar en nuestro showroom</p>
                      </div>
                    </div>
                    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                      <p className="text-xs text-gray-400 font-bold">
                        📍 Recordá que tu pedido estará reservado. Te enviaremos la dirección exacta por email.
                      </p>
                    </div>
                  </div>
                )}

                {checkout.paymentMethod === 'crypto_transfer' && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-6 space-y-5">
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Datos para transferencia</h3>
                    
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-1">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Alias (Pesos ARS)</p>
                        <p className="text-lg font-black text-white font-mono">{PAYMENT_ALIAS_ARS}</p>
                      </div>
                      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-1">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Alias (Dólares USD)</p>
                        <p className="text-lg font-black text-white font-mono">{PAYMENT_ALIAS_USD}</p>
                      </div>
                    </div>
                    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-1">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Crypto (USDT TRC20)</p>
                      <p className="text-xs font-bold text-white font-mono break-all">{CRYPTO_WALLET}</p>
                    </div>

                    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-1">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Monto a transferir</p>
                      <p className="text-xl font-black text-white">${subtotalUSD.toFixed(2)} USD</p>
                      <p className="text-sm text-gray-400 font-bold">{formatCurrency(subtotalARS)}</p>
                    </div>

                    {/* Proof upload — MANDATORY */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-amber-400" />
                        <p className="text-sm font-black text-white">Subí tu comprobante de pago *</p>
                      </div>
                      <label className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                        proofUploaded
                          ? 'border-green-500/50 bg-green-500/10'
                          : errors.proof
                            ? 'border-red-500/50 bg-red-500/10'
                            : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
                      }`}>
                        {proofUploaded ? (
                          <>
                            <Check className="w-6 h-6 text-green-400" />
                            <p className="text-sm text-green-400 font-black">{proofFile?.name}</p>
                            <p className="text-xs text-gray-400 font-bold">Click para cambiar</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-gray-400" />
                            <p className="text-sm text-gray-400 font-bold">
                              Arrastrá o hacé click para subir
                            </p>
                            <p className="text-xs text-gray-500">JPG, PNG o WebP</p>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleProofUpload(f);
                          }}
                        />
                      </label>
                      {errors.proof && (
                        <p className="text-xs text-red-400 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.proof}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {checkout.paymentMethod === 'installments_3' && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">3 Cuotas sin interés</p>
                        <p className="text-xs text-gray-400 font-bold">Te enviaremos un link de pago por WhatsApp</p>
                      </div>
                    </div>
                    <a
                      href={`https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(
                        `¡Hola! Quiero pagar en 3 cuotas sin interés.\n\nProductos:\n${cart.items
                          .map((it) => `• ${it.title} (${it.size}) x${it.quantity} - $${it.price.toFixed(2)} USD`)
                          .join('\n')}\n\nTotal: $${subtotalUSD.toFixed(2)} USD\n\nEmail: ${checkout.contact.email}\nNombre: ${checkout.contact.firstName} ${checkout.contact.lastName}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-green-600 text-white font-black text-sm uppercase tracking-tight hover:bg-green-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Solicitar link de pago por WhatsApp
                    </a>
                  </div>
                )}

                {/* Submit error */}
                {errors.submit && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-sm text-red-300 font-bold">{errors.submit}</p>
                  </div>
                )}

                {/* Confirm button */}
                {checkout.paymentMethod && checkout.paymentMethod !== 'installments_3' && (
                  <button
                    onClick={handleSubmitOrder}
                    disabled={submitting}
                    className="w-full py-4 rounded-xl bg-white text-black font-black text-sm uppercase tracking-tight hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Confirmar orden
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {/* ═══════════════ ORDER SUMMARY SIDEBAR ═══════════════ */}
          <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Resumen del pedido</h3>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {cart.items.map((it) => (
                  <div key={`${it.productId}-${it.size}`} className="flex gap-3">
                    <div className="relative shrink-0">
                      {it.imageUrl && (
                        <img src={it.imageUrl} alt={it.title} className="w-14 h-14 rounded-lg object-cover border border-zinc-800" />
                      )}
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-600 text-white text-[10px] font-black flex items-center justify-center">
                        {it.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white line-clamp-1">{it.title}</p>
                      <p className="text-[10px] text-gray-400 font-bold">Talle: {it.size}</p>
                    </div>
                    <p className="text-xs font-black text-white whitespace-nowrap">
                      ${(it.price * it.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-800 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-bold">Subtotal</span>
                  <span className="text-white font-black">${subtotalUSD.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-bold">Envío</span>
                  <span className="text-gray-400 font-bold">
                    {checkout.fulfillment === 'pickup' ? 'Gratis' : 'A coordinar'}
                  </span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-zinc-800">
                  <span className="text-white font-black uppercase">Total</span>
                  <div className="text-right">
                    <p className="text-white font-black">${subtotalUSD.toFixed(2)} USD</p>
                    <p className="text-xs text-gray-400 font-bold">{formatCurrency(subtotalARS)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timer warning */}
            {cart.getRemainingSeconds() !== null && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300 font-bold">
                  Completá tu compra antes de que expire el carrito
                </p>
              </div>
            )}

            {/* Security badges */}
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span className="font-bold">Compra 100% segura</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Package className="w-4 h-4 text-blue-400" />
                <span className="font-bold">Productos originales garantizados</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable Components ─── */

function InputField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-zinc-900 px-4 py-3 text-sm text-white font-bold placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition-colors ${
          error
            ? 'border-red-500/50 focus:ring-red-500/30'
            : 'border-zinc-800 focus:border-white focus:ring-white/10'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-400 font-bold">{error}</p>}
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
      className={`relative w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
        selected
          ? 'border-white bg-white/5'
          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        selected ? 'bg-white text-black' : 'bg-zinc-800 text-white'
      }`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="text-xs text-gray-400 font-bold">{description}</p>
      </div>
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white flex items-center justify-center">
          <Check className="w-3 h-3 text-black" />
        </div>
      )}
    </button>
  );
}
