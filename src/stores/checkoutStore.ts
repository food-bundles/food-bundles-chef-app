import { create } from 'zustand';
import type { PaymentMethod } from '@/mocks/types';

interface CheckoutState {
  address: string;
  windowIndex: number;
  method: PaymentMethod;
  phone: string;
  selectedVoucherId: string | null;
  setAddress: (address: string) => void;
  setWindowIndex: (index: number) => void;
  setMethod: (method: PaymentMethod) => void;
  setPhone: (phone: string) => void;
  setSelectedVoucherId: (voucherId: string | null) => void;
  reset: () => void;
}

const INITIAL = {
  address: 'KG 11 Ave, Kimihurura, Kigali',
  windowIndex: 0,
  method: 'MOBILE_MONEY' as PaymentMethod,
  phone: '+250 788 123 456',
  selectedVoucherId: null as string | null,
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  ...INITIAL,
  setAddress: (address) => set({ address }),
  setWindowIndex: (windowIndex) => set({ windowIndex }),
  setMethod: (method) => set({ method }),
  setPhone: (phone) => set({ phone }),
  setSelectedVoucherId: (selectedVoucherId) => set({ selectedVoucherId }),
  reset: () => set(INITIAL),
}));
