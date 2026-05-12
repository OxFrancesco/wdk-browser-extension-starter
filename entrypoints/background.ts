import { storage } from '@wxt-dev/storage';

import { CHAIN_ORDER } from '@/src/lib/chains';
import type { RuntimeRequest, RuntimeResponse } from '@/src/lib/messages';
import type {
  DashboardState,
  TransactionRecord,
  VaultEnvelope,
  VaultPlaintext,
  VaultWallet,
} from '@/src/lib/types';
import { refreshTransactionStatuses } from '@/src/lib/tx-monitor';
import { decryptVault, encryptVault } from '@/src/lib/vault-crypto';
import {
  assertValidSeedPhrase,
  broadcastSend,
  executePrimitive,
  generateSeedPhrase,
  getAccountSnapshot,
  getPrimitiveDefinitions,
  quoteSend,
} from '@/src/lib/wdk-adapter';

const vaultItem = storage.defineItem<VaultEnvelope | null>('local:wdk-vault', {
  fallback: null,
});

let sessionVault: VaultPlaintext | null = null;
let sessionPassword: string | null = null;
let sessionExpiresAt: number | null = null;

function normalizeVault(vault: VaultPlaintext): VaultPlaintext {
  return {
    ...vault,
    networkMode: vault.networkMode ?? 'mainnet',
    transactions: vault.transactions.map((transaction) => ({
      ...transaction,
      networkMode: transaction.networkMode ?? vault.networkMode ?? 'mainnet',
    })),
  };
}

function createWallet(name: string, seedPhrase: string): VaultWallet {
  assertValidSeedPhrase(seedPhrase);

  return {
    id: crypto.randomUUID(),
    name: name.trim() || 'Wallet',
    seedPhrase: seedPhrase.trim(),
    accountCount: 1,
    createdAt: Date.now(),
  };
}

function assertUnlocked(): VaultPlaintext {
  if (!sessionVault || !sessionExpiresAt || sessionExpiresAt <= Date.now()) {
    sessionVault = null;
    sessionPassword = null;
    sessionExpiresAt = null;
    throw new Error('Wallet is locked.');
  }

  sessionExpiresAt = Date.now() + sessionVault.sessionTimeoutMinutes * 60_000;
  return sessionVault;
}

async function persistSession(): Promise<void> {
  if (!sessionVault || !sessionPassword) {
    throw new Error('No unlocked vault to persist.');
  }

  await vaultItem.setValue(await encryptVault(sessionVault, sessionPassword));
}

async function refreshSessionTransactions(): Promise<void> {
  if (!sessionVault) return;

  const nextTransactions = await refreshTransactionStatuses(sessionVault.transactions);
  const changed = nextTransactions.some(
    (transaction, index) => transaction !== sessionVault?.transactions[index],
  );

  if (changed) {
    sessionVault.transactions = nextTransactions;
    await persistSession();
  }
}

function publicWallet(wallet: VaultWallet) {
  const { seedPhrase: _seedPhrase, ...safeWallet } = wallet;
  return safeWallet;
}

async function buildDashboard(): Promise<DashboardState> {
  const envelope = await vaultItem.getValue();
  const vault = sessionVault && sessionExpiresAt && sessionExpiresAt > Date.now() ? sessionVault : null;

  if (!vault) {
    sessionVault = null;
    sessionPassword = null;
    sessionExpiresAt = null;

    return {
      locked: true,
      hasVault: Boolean(envelope),
      activeWalletId: null,
      networkMode: 'mainnet',
      sessionExpiresAt: null,
      wallets: [],
      accounts: [],
      transactions: [],
      primitives: getPrimitiveDefinitions(),
    };
  }

  const activeWallet = vault.wallets.find((wallet) => wallet.id === vault.activeWalletId) ?? vault.wallets[0];
  await refreshSessionTransactions();
  const accountIndexes = Array.from({ length: activeWallet?.accountCount ?? 0 }, (_, index) => index);
  const accounts = activeWallet
    ? await Promise.all(
        accountIndexes.flatMap((accountIndex) =>
          CHAIN_ORDER.map((chainId) =>
            getAccountSnapshot(activeWallet, chainId, accountIndex, vault.networkMode),
          ),
        ),
      )
    : [];

  return {
    locked: false,
    hasVault: Boolean(envelope),
    activeWalletId: vault.activeWalletId,
    networkMode: vault.networkMode,
    sessionExpiresAt,
    wallets: vault.wallets.map(publicWallet),
    accounts,
    transactions: vault.transactions.slice().sort((a, b) => b.createdAt - a.createdAt),
    primitives: getPrimitiveDefinitions(),
  };
}

async function createVault(password: string, seedPhrase: string, name: string): Promise<DashboardState> {
  const wallet = createWallet(name, seedPhrase);

  sessionVault = {
    version: 1,
    activeWalletId: wallet.id,
    networkMode: 'mainnet',
    sessionTimeoutMinutes: 15,
    wallets: [wallet],
    transactions: [],
  };
  sessionPassword = password;
  sessionExpiresAt = Date.now() + sessionVault.sessionTimeoutMinutes * 60_000;

  await persistSession();
  return buildDashboard();
}

async function unlock(password: string): Promise<DashboardState> {
  const envelope = await vaultItem.getValue();

  if (!envelope) {
    throw new Error('No vault exists yet.');
  }

  sessionVault = normalizeVault(await decryptVault(envelope, password));
  sessionPassword = password;
  sessionExpiresAt = Date.now() + sessionVault.sessionTimeoutMinutes * 60_000;

  return buildDashboard();
}

async function handleRequest(request: RuntimeRequest): Promise<unknown> {
  if (request.type === 'wallet:generateSeed') {
    return generateSeedPhrase();
  }

  if (request.type === 'vault:get') {
    return buildDashboard();
  }

  if (request.type === 'vault:create') {
    return createVault(request.password, request.seedPhrase, request.name);
  }

  if (request.type === 'vault:unlock') {
    return unlock(request.password);
  }

  if (request.type === 'vault:lock') {
    sessionVault = null;
    sessionPassword = null;
    sessionExpiresAt = null;
    return buildDashboard();
  }

  const vault = assertUnlocked();

  if (request.type === 'network:set') {
    vault.networkMode = request.networkMode;
    await persistSession();
    return buildDashboard();
  }

  if (request.type === 'wallet:add') {
    const wallet = createWallet(request.name, request.seedPhrase);
    vault.wallets.push(wallet);
    vault.activeWalletId = wallet.id;
    await persistSession();
    return buildDashboard();
  }

  if (request.type === 'wallet:addAccount') {
    const wallet = vault.wallets.find((candidate) => candidate.id === request.walletId);
    if (!wallet) throw new Error('Wallet not found.');
    wallet.accountCount += 1;
    await persistSession();
    return buildDashboard();
  }

  if (request.type === 'wallet:setActive') {
    if (!vault.wallets.some((wallet) => wallet.id === request.walletId)) {
      throw new Error('Wallet not found.');
    }
    vault.activeWalletId = request.walletId;
    await persistSession();
    return buildDashboard();
  }

  if (request.type === 'wallet:refresh') {
    return buildDashboard();
  }

  if (request.type === 'send:quote') {
    const wallet = vault.wallets.find((candidate) => candidate.id === request.request.walletId);
    if (!wallet) throw new Error('Wallet not found.');
    return quoteSend(wallet, request.request, vault.networkMode);
  }

  if (request.type === 'send:broadcast') {
    const wallet = vault.wallets.find((candidate) => candidate.id === request.request.walletId);
    if (!wallet) throw new Error('Wallet not found.');

    const now = Date.now();
    const record: TransactionRecord = {
      id: crypto.randomUUID(),
      ...request.request,
      networkMode: vault.networkMode,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await broadcastSend(wallet, request.request, vault.networkMode);
      record.hash = result.hash;
      record.fee = result.fee;
      record.status = 'submitted';
    } catch (error) {
      record.status = 'failed';
      record.error = error instanceof Error ? error.message : 'Broadcast failed.';
    }

    vault.transactions.push(record);
    await persistSession();
    return buildDashboard();
  }

  if (request.type === 'primitive:execute') {
    const wallet = vault.wallets.find((candidate) => candidate.id === request.request.walletId);
    if (!wallet) throw new Error('Wallet not found.');
    return executePrimitive(wallet, request.request, vault.networkMode);
  }

  throw new Error('Unsupported request.');
}

export default defineBackground(() => {
  browser.alarms.create('refresh-transactions', { periodInMinutes: 1 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'refresh-transactions') {
      refreshSessionTransactions().catch(() => undefined);
    }
  });

  browser.runtime.onMessage.addListener((request: RuntimeRequest) => {
    return handleRequest(request)
      .then((data): RuntimeResponse<unknown> => ({ ok: true, data }))
      .catch((error): RuntimeResponse<never> => ({
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected extension error.',
      }));
  });
});
