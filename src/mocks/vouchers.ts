import type { Voucher } from './types';

export const vouchers: Voucher[] = [
  {
    id: 'VC-1001',
    code: 'FB-8H2K-9QRT',
    amount: 50000,
    status: 'AVAILABLE',
    issuedAt: '2026-08-01T08:00:00.000Z',
    expiresAt: '2026-08-31T23:59:59.000Z',
  },
  {
    id: 'VC-1002',
    code: 'FB-3M7P-5WXZ',
    amount: 50000,
    status: 'AVAILABLE',
    issuedAt: '2026-08-01T08:00:00.000Z',
    expiresAt: '2026-08-31T23:59:59.000Z',
  },
  {
    id: 'VC-1003',
    code: 'FB-6D4N-2LKJ',
    amount: 50000,
    status: 'USED',
    issuedAt: '2026-08-01T08:00:00.000Z',
    expiresAt: '2026-08-31T23:59:59.000Z',
    usedAt: '2026-08-12T14:32:00.000Z',
    orderId: 'FB-24762',
  },
  {
    id: 'VC-1004',
    code: 'FB-9T1V-8BCF',
    amount: 50000,
    status: 'EXPIRED',
    issuedAt: '2026-07-01T08:00:00.000Z',
    expiresAt: '2026-07-31T23:59:59.000Z',
  },
];
