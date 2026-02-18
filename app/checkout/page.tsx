"use client";
import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useCartStore } from '@/store/cart';
import { useCheckoutStore } from '@/store/checkout';

type Step = 1 | 2 | 3;

export default function CheckoutPage() {
  const supabase = createBrowserClient();
  const cart = useCartStore();
  const checkout = useCheckoutStore();
  const [step, setStep] = useState<Step>(1);
  const subtotal = useMemo(
    () => cart.items.reduce((acc, it) => acc + it.price * it.quantity, 0),
    [cart.items]
  );
  const shippingOptions = [
    { id: 'pickup', label: 'Retiro en showroom (Gratis)', cost: 0 },
    { id: 'andreani_branch', label: 'Andreani - Retiro en sucursal (Gratis)', cost: 0 }
  ] as const;

  useEffect(() => {
    (async () => {
      if (checkout.orderId) return; // ya creada
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          status: 'draft',
          fulfillment: checkout.fulfillment,
          first_name: checkout.contact.firstName,
          last_name: checkout.contact.lastName,
          email: checkout.contact.email,
          phone: checkout.contact.phone,
          subtotal,
          shipping_cost: 0,
          payment_method: 'bank_transfer',
          payment_alias: 'gus.p21'
        })
        .select('id')
        .single();
      if (error || !order) return;
      checkout.setOrderId(order.id);
      if (cart.items.length > 0) {
        await supabase.from('order_items').insert(
          cart.items.map((it) => ({
            order_id: order.id,
            product_id: it.productId,
            title: it.title,
            slug: it.slug,
            price: it.price,
            size: it.size,
            quantity: it.quantity
          }))
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-xl font-semibold text-white">Checkout</h1>
      <ol className="mb-6 flex items-center gap-4 text-sm">
        <li className={step >= 1 ? 'text-white' : 'text-neutral-500'}>1. Entrega</li>
        <li className={step >= 2 ? 'text-white' : 'text-neutral-500'}>2. Datos</li>
        <li className={step >= 3 ? 'text-white' : 'text-neutral-500'}>3. Revisión</li>
      </ol>

      {step === 1 && (
        <div className="space-y-4 rounded border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex gap-3">
            <button
              className={`rounded px-4 py-2 text-sm ${
                checkout.fulfillment === 'pickup' ? 'bg-white text-black' : 'bg-neutral-800 text-white'
              }`}
              onClick={() => checkout.setFulfillment('pickup')}
            >
              Retiro en tienda
            </button>
            <button
              className={`rounded px-4 py-2 text-sm ${
                checkout.fulfillment === 'shipping' ? 'bg-white text-black' : 'bg-neutral-800 text-white'
              }`}
              onClick={() => checkout.setFulfillment('shipping')}
            >
              Envío a domicilio
            </button>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-neutral-300">Opciones de envío</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {shippingOptions.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="ship" defaultChecked={opt.id !== 'pickup' ? false : true} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="pt-2">
            <button className="rounded bg-white px-4 py-2 text-sm font-medium text-black" onClick={() => setStep(2)}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 rounded border border-neutral-800 bg-neutral-950 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" placeholder="Nombre" value={checkout.contact.firstName} onChange={(e) => checkout.updateContact({ firstName: e.target.value })} />
            <input className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" placeholder="Apellido" value={checkout.contact.lastName} onChange={(e) => checkout.updateContact({ lastName: e.target.value })} />
            <input className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" placeholder="Email" value={checkout.contact.email} onChange={(e) => checkout.updateContact({ email: e.target.value })} />
            <input className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" placeholder="Teléfono" value={checkout.contact.phone} onChange={(e) => checkout.updateContact({ phone: e.target.value })} />
          </div>

          {checkout.fulfillment === 'shipping' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" placeholder="Calle" value={checkout.address.street} onChange={(e) => checkout.updateAddress({ street: e.target.value })} />
              <input className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" placeholder="Número" value={checkout.address.number} onChange={(e) => checkout.updateAddress({ number: e.target.value })} />
              <input className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" placeholder="Piso/Depto (opcional)" value={checkout.address.unit} onChange={(e) => checkout.updateAddress({ unit: e.target.value })} />
              <input className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" placeholder="Ciudad" value={checkout.address.city} onChange={(e) => checkout.updateAddress({ city: e.target.value })} />
              <input className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" placeholder="Provincia" value={checkout.address.province} onChange={(e) => checkout.updateAddress({ province: e.target.value })} />
              <input className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" placeholder="CP" value={checkout.address.postalCode} onChange={(e) => checkout.updateAddress({ postalCode: e.target.value })} />
              <input className="sm:col-span-2 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" placeholder="Observaciones (opcional)" value={checkout.address.notes} onChange={(e) => checkout.updateAddress({ notes: e.target.value })} />
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button className="rounded bg-neutral-800 px-4 py-2 text-sm font-medium text-white" onClick={() => setStep(1)}>
              Atrás
            </button>
            <button className="rounded bg-white px-4 py-2 text-sm font-medium text-black" onClick={() => setStep(3)}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 rounded border border-neutral-800 bg-neutral-950 p-4">
          <div className="text-sm text-white">Subtotal: ${subtotal.toFixed(2)}</div>
          <div className="text-sm text-neutral-400">Envío: Gratis (retiro en showroom o Andreani sucursal)</div>
          <div className="text-sm text-neutral-400">Modalidad: {checkout.fulfillment === 'pickup' ? 'Retiro en tienda' : 'Envío a domicilio'}</div>
          <div className="rounded border border-neutral-800 p-3">
            <div className="text-sm font-semibold text-white">Pago por transferencia</div>
            <div className="mt-1 text-sm text-neutral-300">Alias: <span className="font-mono">gus.p21</span></div>
            <div className="mt-2 text-xs text-neutral-400">Subí el comprobante para acelerar la validación</div>
            <form className="mt-2 flex items-center gap-2" onSubmit={async (e) => {
              e.preventDefault();
              if (!checkout.orderId) return;
              const input = (e.currentTarget.elements.namedItem('proof') as HTMLInputElement);
              if (!input.files || input.files.length === 0) return;
              const fd = new FormData();
              fd.append('file', input.files[0]);
              fd.append('order_id', checkout.orderId);
              await fetch('/api/upload-proof', { method: 'POST', body: fd });
              alert('Comprobante enviado. Validaremos tu pago a la brevedad.');
            }}>
              <input name="proof" type="file" accept="image/*" className="text-xs" />
              <button className="rounded bg-white px-3 py-1 text-xs font-medium text-black">Subir comprobante</button>
            </form>
          </div>
          <div className="pt-2">
            <button className="rounded bg-neutral-700 px-4 py-2 text-sm font-medium text-white" disabled>
              Pagar (próximamente)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
