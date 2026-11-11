import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ transactionsQueried: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({
  requireSection: async () => ({ ok: true, auth: { role: 'business_owner', claims: { b: 'business_1' } } }),
}));
vi.mock('@/lib/payments', () => ({ paymentsAreLive: () => false }));
vi.mock('@/lib/observability', () => ({ trackApiError: vi.fn() }));
vi.mock('@/lib/firebase-admin', () => ({
  getAdminFirestore: () => ({
    collection: (name: string) => {
      if (name === 'transactions') {
        mocks.transactionsQueried();
        throw new Error('Unverified transactions must not be payout-eligible');
      }
      return { where: () => ({ orderBy: () => ({ limit: () => ({
        get: async () => ({ docs: [{ id: 'old_record', data: () => ({ status: 'Processing', netMinorUnits: 100 }) }] }),
      }) }) }) };
    },
  }),
}));

import { GET } from '@/app/api/vendor/payouts/route';

describe('pay-at-garage payout boundary', () => {
  it('retains old records without claiming a payout balance or scanning transactions', async () => {
    const response = await GET(new NextRequest('http://localhost/api/vendor/payouts'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({
      paymentsLive: false,
      available: { transactionCount: 0, netMinorUnits: 0 },
      transactions: [],
      payouts: [{ id: 'old_record', status: 'Processing' }],
    });
    expect(mocks.transactionsQueried).not.toHaveBeenCalled();
  });
});
