import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TransactionRecord } from './types';
import { refreshTransactionStatuses } from './tx-monitor';

const baseTx: TransactionRecord = {
  id: 'tx-1',
  walletId: 'wallet-1',
  accountIndex: 0,
  chainId: 'ethereum',
  assetId: 'ETH',
  to: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  amount: '1',
  hash: '0xabc',
  status: 'submitted',
  createdAt: 1,
  updatedAt: 1,
};

describe('transaction monitoring', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('marks confirmed EVM receipts as confirmed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ result: { status: '0x1' } }),
      })),
    );

    const [refreshed] = await refreshTransactionStatuses([baseTx]);
    expect(refreshed.status).toBe('confirmed');
    expect(refreshed.updatedAt).toBeGreaterThan(1);
  });

  it('leaves missing receipts submitted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ result: null }),
      })),
    );

    const [refreshed] = await refreshTransactionStatuses([baseTx]);
    expect(refreshed.status).toBe('submitted');
  });
});
