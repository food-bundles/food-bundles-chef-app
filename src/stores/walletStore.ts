import { create } from 'zustand';
import { account } from '@/mocks/account';
import { transactions as seedTransactions } from '@/mocks/transactions';
import type { Transaction } from '@/mocks/types';
import { sleep, getCache, setCache, clearCache } from '@/lib';

export type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';

const MAX_TOP_UP = 5000000;
const CACHE_KEY = 'wallet_transactions';
const CACHE_TTL_MS = 30_000;

interface WalletState {
  status: AsyncStatus;
  balance: number;
  transactions: Transaction[];
  fetch: () => Promise<void>;
  topUp: (amount: number) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  status: 'idle',
  balance: account.walletBalance,
  transactions: [],
  fetch: async () => {
    set({ status: 'loading' });
    const cached = await getCache<Transaction[]>(CACHE_KEY);
    if (cached) {
      set({ status: 'ready', transactions: cached });
      return;
    }
    await sleep(700);
    await setCache(CACHE_KEY, seedTransactions, CACHE_TTL_MS);
    set({ status: 'ready', transactions: seedTransactions });
  },
  topUp: async (amount) => {
    const clamped = Math.min(MAX_TOP_UP, Math.max(0, Math.round(amount)));
    set({ status: 'loading' });
    await sleep(1300);
    await clearCache(CACHE_KEY);
    set({ status: 'ready', balance: get().balance + clamped });
  },
}));

export { MAX_TOP_UP };
