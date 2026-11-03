import type { Transaction } from './types';

export const transactions: Transaction[] = [
  {
    id: 'TXN-9001',
    type: 'TOP_UP',
    amount: 500000,
    date: '2026-08-04T09:00:00',
    note: 'Wallet top-up via MTN MoMo',
  },
  {
    id: 'TXN-9002',
    type: 'PAYMENT',
    amount: -48900,
    date: '2026-08-01T10:15:00',
    orderId: 'FB-24790',
    note: 'Order payment — FB-24790',
  },
  {
    id: 'TXN-9003',
    type: 'PAYMENT',
    amount: -21300,
    date: '2026-08-03T09:00:00',
    orderId: 'FB-24801',
    note: 'Order payment — FB-24801',
  },
  {
    id: 'TXN-9004',
    type: 'REFUND',
    amount: 31600,
    date: '2026-07-21T09:00:00',
    orderId: 'FB-24755',
    note: 'Refund — order cancelled',
  },
  {
    id: 'TXN-9005',
    type: 'TOP_UP',
    amount: 300000,
    date: '2026-07-18T14:30:00',
    note: 'Wallet top-up via Airtel Money',
  },
];
