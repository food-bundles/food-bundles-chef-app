import { create } from 'zustand';
import { vouchers as seedVouchers } from '@/mocks/vouchers';
import { dataConsentSeed } from '@/mocks/dataConsent';
import type { CreditScore, DataConsent, DataConsentSource, Tier, Voucher } from '@/mocks/types';

const CONSENT_WINDOW_DAYS = 30;
const VOUCHER_WINDOW_DAYS = 30;

const randomCodeSegment = (): string =>
  Math.random().toString(36).slice(2, 6).toUpperCase();

interface VouchersState {
  vouchers: Voucher[];
  nextGrantDate: string;
  consentList: DataConsent[];
  creditScore: CreditScore | null;
  /** Marks one voucher as used against an order; no-op if it's already spent or missing. */
  redeemVoucher: (voucherId: string, orderId: string) => void;
  /** Grants or revokes a data source. When granting with `remember`, the consent never expires and won't be re-asked. */
  setConsent: (source: DataConsentSource, granted: boolean, remember?: boolean) => void;
  /** True once a previously granted source's 30-day window has elapsed. */
  isConsentExpired: (source: DataConsentSource) => boolean;
  /** Stores the outcome of a scoring run, shown on the score-result screen. */
  setCreditScore: (score: CreditScore) => void;
  /** Issues a new AVAILABLE voucher for the approved amount, valid for 30 days. Returns the new voucher. */
  requestVoucher: (amountRwf: number) => Voucher;
}

/** Voucher pool, monthly grant schedule, and data-consent/credit-score state for the voucher application flow. */
export const useVouchersStore = create<VouchersState>((set, get) => ({
  vouchers: seedVouchers,
  nextGrantDate: '2026-09-01',
  consentList: dataConsentSeed,
  creditScore: null,
  redeemVoucher: (voucherId, orderId) =>
    set((state) => ({
      vouchers: state.vouchers.map((voucher) =>
        voucher.id === voucherId && voucher.status === 'AVAILABLE'
          ? { ...voucher, status: 'USED', usedAt: new Date().toISOString(), orderId }
          : voucher,
      ),
    })),
  setConsent: (source, granted, remember) =>
    set((state) => ({
      consentList: state.consentList.map((consent) => {
        if (consent.source !== source) return consent;
        if (!granted) return { ...consent, granted: false, grantedAt: null, expiresAt: null };
        const grantedAt = new Date();
        if (remember) {
          return { ...consent, granted: true, grantedAt: grantedAt.toISOString(), expiresAt: null };
        }
        const expiresAt = new Date(grantedAt);
        expiresAt.setDate(expiresAt.getDate() + CONSENT_WINDOW_DAYS);
        return { ...consent, granted: true, grantedAt: grantedAt.toISOString(), expiresAt: expiresAt.toISOString() };
      }),
    })),
  isConsentExpired: (source) => {
    const consent = get().consentList.find((c) => c.source === source);
    if (!consent?.granted || !consent.expiresAt) return false;
    return new Date(consent.expiresAt).getTime() < Date.now();
  },
  setCreditScore: (creditScore) => set({ creditScore }),
  requestVoucher: (amountRwf) => {
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt);
    expiresAt.setDate(expiresAt.getDate() + VOUCHER_WINDOW_DAYS);
    const voucher: Voucher = {
      id: `VC-${1000 + get().vouchers.length + 1}`,
      code: `FB-${randomCodeSegment()}-${randomCodeSegment()}`,
      amount: amountRwf,
      status: 'AVAILABLE',
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    set((state) => ({ vouchers: [...state.vouchers, voucher] }));
    return voucher;
  },
}));

/** True once the restaurant has subscribed to any paid tier — vouchers require an active subscription. */
export const isVouchersUnlocked = (tier: Tier): boolean => tier !== 'NONE';
