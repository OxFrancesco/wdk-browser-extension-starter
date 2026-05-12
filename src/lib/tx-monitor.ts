import { getChain } from './chains';
import type { TransactionRecord } from './types';

async function postJsonRpc<T>(url: string, method: string, params: unknown[]): Promise<T | null> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC status ${response.status}`);
  }

  const payload = (await response.json()) as { result?: T | null; error?: { message?: string } };
  if (payload.error) {
    throw new Error(payload.error.message ?? 'RPC error');
  }
  return payload.result ?? null;
}

async function getTransactionStatus(tx: TransactionRecord): Promise<TransactionRecord['status']> {
  if (!tx.hash) {
    return tx.status;
  }

  const chain = getChain(tx.chainId, tx.networkMode ?? 'mainnet');

  if (chain.family === 'bitcoin') {
    const baseUrl = chain.networkMode === 'testnet'
      ? 'https://mempool.space/testnet/api'
      : 'https://mempool.space/api';
    const response = await fetch(`${baseUrl}/tx/${tx.hash}/status`);
    if (!response.ok) return tx.status;
    const status = (await response.json()) as { confirmed?: boolean };
    return status.confirmed ? 'confirmed' : 'submitted';
  }

  if (chain.family === 'evm' && chain.rpcUrls?.[0]) {
    const receipt = await postJsonRpc<{ status?: string }>(chain.rpcUrls[0], 'eth_getTransactionReceipt', [
      tx.hash,
    ]);
    if (!receipt) return 'submitted';
    return receipt.status === '0x0' ? 'failed' : 'confirmed';
  }

  if (chain.family === 'solana' && chain.rpcUrls?.[0]) {
    const result = await postJsonRpc<{ value: Array<{ confirmationStatus?: string; err?: unknown } | null> }>(
      chain.rpcUrls[0],
      'getSignatureStatuses',
      [[tx.hash], { searchTransactionHistory: true }],
    );
    const status = result?.value?.[0];
    if (!status) return 'submitted';
    if (status.err) return 'failed';
    return status.confirmationStatus === 'finalized' || status.confirmationStatus === 'confirmed'
      ? 'confirmed'
      : 'submitted';
  }

  return tx.status;
}

export async function refreshTransactionStatuses(
  transactions: TransactionRecord[],
): Promise<TransactionRecord[]> {
  const pending = transactions.filter((tx) => tx.status === 'submitted' && tx.hash);
  const refreshed = new Map<string, TransactionRecord>();

  await Promise.all(
    pending.map(async (tx) => {
      try {
        const nextStatus = await getTransactionStatus(tx);
        if (nextStatus !== tx.status) {
          refreshed.set(tx.id, { ...tx, status: nextStatus, updatedAt: Date.now() });
        }
      } catch {
        refreshed.set(tx.id, tx);
      }
    }),
  );

  return transactions.map((tx) => refreshed.get(tx.id) ?? tx);
}
