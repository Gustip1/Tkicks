import { create } from 'zustand';

export type Fulfillment = 'pickup' | 'shipping';

export interface CheckoutState {
  orderId: string | null;
  fulfillment: Fulfillment;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
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
  updateContact: (p: Partial<CheckoutState['contact']>) => void;
  updateAddress: (p: Partial<CheckoutState['address']>) => void;
  setOrderId: (id: string) => void;
  reset: () => void;
}

const initial: Omit<CheckoutState, 'setFulfillment' | 'updateContact' | 'updateAddress' | 'setOrderId' | 'reset'> = {
  orderId: null,
  fulfillment: 'pickup',
  contact: { firstName: '', lastName: '', email: '', phone: '' },
  address: { street: '', number: '', unit: '', city: '', province: '', postalCode: '', notes: '' }
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  ...initial,
  setFulfillment: (f) => set({ fulfillment: f }),
  updateContact: (p) => set((s) => ({ contact: { ...s.contact, ...p } })),
  updateAddress: (p) => set((s) => ({ address: { ...s.address, ...p } })),
  setOrderId: (id) => set({ orderId: id }),
  reset: () => set(initial)
}));


