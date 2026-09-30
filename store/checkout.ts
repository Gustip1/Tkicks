import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Fulfillment = 'pickup' | 'shipping';
export type PaymentMethod = 'cash' | 'crypto_transfer' | 'installments_3';

export interface AppliedDiscount {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  amount: number;
}

export interface CheckoutState {
  orderId: string | null;
  fulfillment: Fulfillment;
  paymentMethod: PaymentMethod | null;
  appliedDiscount: AppliedDiscount | null;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    document: string;
  };
  address: {
    street: string;
    number: string;
    unit: string;
    city: string;
    province: string;
    postalCode: string;
    notes: string;
  };
  setFulfillment: (f: Fulfillment) => void;
  setPaymentMethod: (m: PaymentMethod) => void;
  updateContact: (p: Partial<CheckoutState['contact']>) => void;
  updateAddress: (p: Partial<CheckoutState['address']>) => void;
  setOrderId: (id: string) => void;
  setAppliedDiscount: (d: AppliedDiscount | null) => void;
  reset: () => void;
}

const initial: Omit<CheckoutState, 'setFulfillment' | 'setPaymentMethod' | 'updateContact' | 'updateAddress' | 'setOrderId' | 'setAppliedDiscount' | 'reset'> = {
  orderId: null,
  fulfillment: 'pickup',
  paymentMethod: null,
  appliedDiscount: null,
  contact: { firstName: '', lastName: '', email: '', phone: '', document: '' },
  address: { street: '', number: '', unit: '', city: '', province: '', postalCode: '', notes: '' }
};

/**
 * Los datos de contacto y envío se guardan en el navegador del cliente: si sale
 * del checkout (por ejemplo, a consultar por WhatsApp) y vuelve, no tiene que
 * escribir todo de nuevo. El medio de pago y el pedido no se guardan.
 *
 * skipHydration: el checkout se pre-renderiza vacío en el servidor; los datos
 * se cargan al montar (rehydrate) para que el HTML del servidor y el del
 * navegador coincidan.
 */
export const useCheckoutStore = create<CheckoutState>()(persist((set) => ({
  ...initial,
  setFulfillment: (f) => set({ fulfillment: f, paymentMethod: null }),
  setPaymentMethod: (m) => set({ paymentMethod: m }),
  updateContact: (p) => set((s) => ({ contact: { ...s.contact, ...p } })),
  updateAddress: (p) => set((s) => ({ address: { ...s.address, ...p } })),
  setOrderId: (id) => set({ orderId: id }),
  setAppliedDiscount: (d) => set({ appliedDiscount: d }),
  reset: () => set(initial)
}), {
  name: 'checkout-datos',
  storage: createJSONStorage(() => localStorage),
  partialize: (s) => ({ fulfillment: s.fulfillment, contact: s.contact, address: s.address }),
  skipHydration: true,
}));


