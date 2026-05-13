import { storage } from '@wxt-dev/storage';

import {
  addCustomEvmChain,
  addRpcPreference,
  findEvmChainByHexId,
  getChainList,
  getEvmChain,
  normalizeAddEthereumChainParameter,
  normalizeCustomEvmChains,
  normalizeRpcPreferences,
  normalizeRpcUrl,
  removeCustomEvmChain,
  removeRpcPreference,
  rpcPermissionPattern,
  toHexChainId,
  withRpcPreferences,
} from '@/src/lib/chains';
import type { DappApproval, DappRequest, RuntimeRequest, RuntimeResponse } from '@/src/lib/messages';
import type {
  DappPermission,
  DashboardState,
  CustomEvmChain,
  EvmChainId,
  NetworkMode,
  TransactionRecord,
  VaultEnvelope,
  VaultPlaintext,
  VaultWallet,
} from '@/src/lib/types';
import { refreshTransactionStatuses } from '@/src/lib/tx-monitor';
import {
  createVaultKey,
  CURRENT_KDF_ITERATIONS,
  encryptVaultWithKey,
  openVault,
  type VaultKey,
} from '@/src/lib/vault-crypto';
import {
  assertValidSeedPhrase,
  broadcastSend,
  executePrimitive,
  generateSeedPhrase,
  getAccountSnapshot,
  getDappAccountAddress,
  getPrimitiveDefinitions,
  quoteSend,
  sendDappTransaction,
  signDappMessage,
  signDappTypedData,
} from '@/src/lib/wdk-adapter';

const vaultItem = storage.defineItem<VaultEnvelope | null>('local:wdk-vault', {
  fallback: null,
});

let sessionVault: VaultPlaintext | null = null;
let sessionKey: VaultKey | null = null;
let sessionExpiresAt: number | null = null;

type PendingDappApproval = DappApproval & {
  resolve: (approved: boolean) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const pendingDappApprovals = new Map<string, PendingDappApproval>();
const READ_ONLY_ETH_METHODS = new Set([
  'eth_blockNumber',
  'eth_call',
  'eth_estimateGas',
  'eth_feeHistory',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getCode',
  'eth_getLogs',
  'eth_getStorageAt',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_maxPriorityFeePerGas',
  'eth_syncing',
  'net_version',
  'web3_clientVersion',
]);

function normalizeDappPermissions(
  permissions: VaultPlaintext['dappPermissions'] | undefined,
  customEvmChains: VaultPlaintext['customEvmChains'] | undefined,
): VaultPlaintext['dappPermissions'] {
  const normalized: VaultPlaintext['dappPermissions'] = {};

  for (const permission of Object.values(permissions ?? {})) {
    try {
      const origin = new URL(permission.origin).origin;
      if (!origin.startsWith('https://')) continue;
      getEvmChain(permission.chainId, permission.networkMode, customEvmChains);
      normalized[origin] = { ...permission, origin };
    } catch {
      // Ignore malformed legacy records.
    }
  }

  return normalized;
}

function normalizeVault(vault: VaultPlaintext): VaultPlaintext {
  const customEvmChains = normalizeCustomEvmChains(vault.customEvmChains);

  return {
    ...vault,
    networkMode: vault.networkMode ?? 'mainnet',
    customEvmChains,
    rpcPreferences: normalizeRpcPreferences(vault.rpcPreferences, customEvmChains),
    dappPermissions: normalizeDappPermissions(vault.dappPermissions, customEvmChains),
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
    sessionKey = null;
    sessionExpiresAt = null;
    throw new Error('Wallet is locked.');
  }

  sessionExpiresAt = Date.now() + sessionVault.sessionTimeoutMinutes * 60_000;
  return sessionVault;
}

async function persistSession(): Promise<void> {
  if (!sessionVault || !sessionKey) {
    throw new Error('No unlocked vault to persist.');
  }

  await vaultItem.setValue(await encryptVaultWithKey(sessionVault, sessionKey));
}

async function refreshSessionTransactions(): Promise<void> {
  if (!sessionVault) return;

  const nextTransactions = await refreshTransactionStatuses(
    sessionVault.transactions,
    sessionVault.rpcPreferences,
    sessionVault.customEvmChains,
  );
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
    sessionKey = null;
    sessionExpiresAt = null;

    return {
      locked: true,
      hasVault: Boolean(envelope),
      activeWalletId: null,
      networkMode: 'mainnet',
      customEvmChains: {},
      rpcPreferences: {},
      dappPermissions: {},
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
          getChainList(vault.networkMode, vault.customEvmChains).map((chain) =>
            getAccountSnapshot(
              activeWallet,
              chain.id,
              accountIndex,
              vault.networkMode,
              vault.rpcPreferences,
              vault.customEvmChains,
            ),
          ),
        ),
      )
    : [];

  return {
    locked: false,
    hasVault: Boolean(envelope),
    activeWalletId: vault.activeWalletId,
    networkMode: vault.networkMode,
    customEvmChains: vault.customEvmChains,
    rpcPreferences: vault.rpcPreferences,
    dappPermissions: vault.dappPermissions,
    sessionExpiresAt,
    wallets: vault.wallets.map(publicWallet),
    accounts,
    transactions: vault.transactions.slice().sort((a, b) => b.createdAt - a.createdAt),
    primitives: getPrimitiveDefinitions(),
  };
}

async function getPageBridgeStatus() {
  const envelope = await vaultItem.getValue();
  const unlocked = Boolean(sessionVault && sessionExpiresAt && sessionExpiresAt > Date.now());

  return {
    locked: !unlocked,
    hasVault: Boolean(envelope),
    networkMode: unlocked ? sessionVault?.networkMode ?? 'mainnet' : 'mainnet',
  };
}

async function createVault(password: string, seedPhrase: string, name: string): Promise<DashboardState> {
  const wallet = createWallet(name, seedPhrase);
  sessionKey = await createVaultKey(password);

  sessionVault = {
    version: 1,
    activeWalletId: wallet.id,
    networkMode: 'mainnet',
    customEvmChains: {},
    rpcPreferences: {},
    dappPermissions: {},
    sessionTimeoutMinutes: 15,
    wallets: [wallet],
    transactions: [],
  };
  sessionExpiresAt = Date.now() + sessionVault.sessionTimeoutMinutes * 60_000;

  await persistSession();
  return buildDashboard();
}

async function unlock(password: string): Promise<DashboardState> {
  const envelope = await vaultItem.getValue();

  if (!envelope) {
    throw new Error('No vault exists yet.');
  }

  const opened = await openVault(envelope, password);
  sessionVault = normalizeVault(opened.vault);
  sessionKey = opened.vaultKey;
  sessionExpiresAt = Date.now() + sessionVault.sessionTimeoutMinutes * 60_000;

  if (opened.vaultKey.iterations < CURRENT_KDF_ITERATIONS) {
    sessionKey = await createVaultKey(password, { enforcePasswordPolicy: false });
    await persistSession();
  }

  return buildDashboard();
}

async function assertRpcHostPermission(url: string): Promise<void> {
  const originPattern = rpcPermissionPattern(url);
  const hasPermission = await browser.permissions.contains({ origins: [originPattern] });

  if (!hasPermission) {
    throw new Error(`Grant host permission for ${new URL(url).origin} before adding this RPC.`);
  }
}

function normalizeOrigin(origin: string): string {
  const parsed = new URL(origin);
  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS websites can connect to this wallet.');
  }
  return parsed.origin;
}

function getActiveWallet(vault: VaultPlaintext): VaultWallet {
  const wallet = vault.wallets.find((candidate) => candidate.id === vault.activeWalletId) ?? vault.wallets[0];
  if (!wallet) throw new Error('No wallet is available.');
  return wallet;
}

function getDappPermission(vault: VaultPlaintext, origin: string): DappPermission | null {
  const permission = vault.dappPermissions[origin];
  if (!permission) return null;
  if (!vault.wallets.some((wallet) => wallet.id === permission.walletId)) return null;
  return permission;
}

function parseDappParams(params: unknown): unknown[] {
  return Array.isArray(params) ? params : params === undefined ? [] : [params];
}

function stringifyPayload(payload: unknown): string {
  if (payload === undefined) return '';
  if (typeof payload === 'string') return payload;
  return JSON.stringify(payload, null, 2);
}

async function requestDappApproval(
  approval: Omit<DappApproval, 'id'>,
): Promise<boolean> {
  const id = crypto.randomUUID();
  const url = browser.runtime.getURL(`/connect.html?id=${encodeURIComponent(id)}`);

  const approved = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      pendingDappApprovals.delete(id);
      resolve(false);
    }, 120_000);

    pendingDappApprovals.set(id, {
      id,
      ...approval,
      resolve,
      timeout,
    });

    browser.windows
      .create({
        url,
        type: 'popup',
        width: 420,
        height: 560,
        focused: true,
      })
      .catch(() => undefined);
  });

  if (!approved) {
    throw new Error('User rejected the request.');
  }

  return approved;
}

async function postJsonRpc<T>(
  url: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method,
        params,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`RPC status ${response.status}`);
  }

  const payload = (await response.json()) as { result?: T; error?: { message?: string } };
  if (payload.error) {
    throw new Error(payload.error.message ?? 'RPC error');
  }

  return payload.result as T;
}

function getPermissionChain(vault: VaultPlaintext, permission: DappPermission) {
  return getEvmChain(permission.chainId, permission.networkMode, vault.customEvmChains);
}

async function getPermissionAddress(
  vault: VaultPlaintext,
  permission: DappPermission,
): Promise<string> {
  const wallet = vault.wallets.find((candidate) => candidate.id === permission.walletId);
  if (!wallet) throw new Error('Approved wallet is no longer available.');

  return getDappAccountAddress(
    wallet,
    permission.chainId,
    permission.accountIndex,
    permission.networkMode,
    vault.rpcPreferences,
    vault.customEvmChains,
  );
}

async function approveDappConnection(
  vault: VaultPlaintext,
  origin: string,
): Promise<DappPermission> {
  const wallet = getActiveWallet(vault);
  const chainId: EvmChainId = 'ethereum';
  const permission: DappPermission = {
    origin,
    walletId: wallet.id,
    accountIndex: 0,
    chainId,
    networkMode: vault.networkMode,
    approvedAt: Date.now(),
    updatedAt: Date.now(),
  };
  const address = await getDappAccountAddress(
    wallet,
    chainId,
    permission.accountIndex,
    permission.networkMode,
    vault.rpcPreferences,
    vault.customEvmChains,
  );
  const chain = getPermissionChain(vault, permission);

  await requestDappApproval({
    origin,
    action: 'connect',
    title: 'Connect website',
    description: 'Allow this site to view your active EVM address and request signatures or transactions.',
    chainLabel: chain.networkLabel,
    address,
  });

  vault.dappPermissions[origin] = permission;
  await persistSession();
  return permission;
}

async function verifyCustomEvmChainRpc(chain: CustomEvmChain): Promise<void> {
  await Promise.all(
    chain.rpcUrls.map(async (rpcUrl) => {
      await assertRpcHostPermission(rpcUrl);
      const reportedChainId = await postJsonRpc<string>(rpcUrl, 'eth_chainId', []);
      if (reportedChainId?.toLowerCase() !== toHexChainId(chain.chainId)) {
        throw new Error(`${new URL(rpcUrl).origin} reported ${reportedChainId ?? 'no chain id'}, expected ${toHexChainId(chain.chainId)}.`);
      }
    }),
  );
}

async function requireDappPermission(
  vault: VaultPlaintext,
  origin: string,
): Promise<DappPermission> {
  const existing = getDappPermission(vault, origin);
  if (existing) return existing;
  return approveDappConnection(vault, origin);
}

async function handleDappRequest(vault: VaultPlaintext, request: DappRequest): Promise<unknown> {
  const origin = normalizeOrigin(request.origin);
  const params = parseDappParams(request.params);
  const existingPermission = getDappPermission(vault, origin);

  if (request.method === 'eth_requestAccounts') {
    const permission = existingPermission ?? (await approveDappConnection(vault, origin));
    return [await getPermissionAddress(vault, permission)];
  }

  if (request.method === 'eth_accounts') {
    return existingPermission ? [await getPermissionAddress(vault, existingPermission)] : [];
  }

  if (request.method === 'eth_chainId') {
    const permission = existingPermission ?? {
      chainId: 'ethereum' as const,
      networkMode: vault.networkMode,
    };
    return toHexChainId(getEvmChain(permission.chainId, permission.networkMode, vault.customEvmChains).chainId);
  }

  if (request.method === 'net_version') {
    const permission = existingPermission ?? {
      chainId: 'ethereum' as const,
      networkMode: vault.networkMode,
    };
    return String(getEvmChain(permission.chainId, permission.networkMode, vault.customEvmChains).chainId);
  }

  if (request.method === 'wallet_switchEthereumChain') {
    const [{ chainId } = {}] = params as Array<{ chainId?: string }>;
    if (!chainId) throw new Error('wallet_switchEthereumChain requires a chainId.');
    const target = findEvmChainByHexId(chainId, vault.customEvmChains);
    if (!target) throw new Error(`Unsupported EVM chain: ${chainId}.`);
    const permission = await requireDappPermission(vault, origin);
    vault.dappPermissions[origin] = {
      ...permission,
      chainId: target.chainId,
      networkMode: target.networkMode,
      updatedAt: Date.now(),
    };
    vault.networkMode = target.networkMode;
    await persistSession();
    return null;
  }

  if (request.method === 'wallet_addEthereumChain') {
    const [chainRequest] = params;
    const chainId = (chainRequest as { chainId?: string } | undefined)?.chainId;
    if (chainId && findEvmChainByHexId(chainId, vault.customEvmChains)) {
      return null;
    }

    const customChain = normalizeAddEthereumChainParameter(chainRequest, vault.networkMode);
    await requestDappApproval({
      origin,
      action: 'chain',
      title: 'Add network',
      description: 'Allow this site to add an EVM network and use the listed RPC endpoint from this wallet.',
      chainLabel: customChain.networkLabel,
      payload: stringifyPayload({
        chainId: toHexChainId(customChain.chainId),
        rpcUrls: customChain.rpcUrls,
        nativeCurrency: customChain.nativeCurrency,
      }),
      permissionOrigins: customChain.rpcUrls.map(rpcPermissionPattern),
    });
    await verifyCustomEvmChainRpc(customChain);
    vault.customEvmChains = addCustomEvmChain(vault.customEvmChains, customChain);
    vault.rpcPreferences = normalizeRpcPreferences(vault.rpcPreferences, vault.customEvmChains);
    await persistSession();
    return null;
  }

  const permission = await requireDappPermission(vault, origin);
  const wallet = vault.wallets.find((candidate) => candidate.id === permission.walletId);
  if (!wallet) throw new Error('Approved wallet is no longer available.');
  const address = await getPermissionAddress(vault, permission);
  const chain = withRpcPreferences(getPermissionChain(vault, permission), vault.rpcPreferences);

  if (READ_ONLY_ETH_METHODS.has(request.method)) {
    if (request.method === 'net_version') return String(chain.chainId);
    const rpcUrl = chain.rpcUrls?.[0];
    if (!rpcUrl) throw new Error(`${chain.networkLabel} has no RPC URL configured.`);
    return postJsonRpc(rpcUrl, request.method, params);
  }

  if (request.method === 'personal_sign' || request.method === 'eth_sign') {
    const [first, second] = params;
    const message = String(first).toLowerCase() === address.toLowerCase() ? second : first;
    await requestDappApproval({
      origin,
      action: 'sign',
      title: 'Sign message',
      description: 'Review this message before signing with your EVM account.',
      chainLabel: chain.networkLabel,
      address,
      payload: stringifyPayload(message),
    });
    return signDappMessage(
      wallet,
      permission.chainId,
      permission.accountIndex,
      permission.networkMode,
      message,
      vault.rpcPreferences,
      vault.customEvmChains,
    );
  }

  if (
    request.method === 'eth_signTypedData' ||
    request.method === 'eth_signTypedData_v3' ||
    request.method === 'eth_signTypedData_v4'
  ) {
    const [first, second] = params;
    const typedData = String(first).toLowerCase() === address.toLowerCase() ? second : first;
    await requestDappApproval({
      origin,
      action: 'sign',
      title: 'Sign typed data',
      description: 'Review this typed-data payload before signing with your EVM account.',
      chainLabel: chain.networkLabel,
      address,
      payload: stringifyPayload(typedData),
    });
    return signDappTypedData(
      wallet,
      permission.chainId,
      permission.accountIndex,
      permission.networkMode,
      typedData,
      vault.rpcPreferences,
      vault.customEvmChains,
    );
  }

  if (request.method === 'eth_sendTransaction') {
    const [transaction] = params as [Record<string, unknown>?];
    if (!transaction) throw new Error('eth_sendTransaction requires a transaction payload.');
    await requestDappApproval({
      origin,
      action: 'transaction',
      title: 'Send transaction',
      description: 'Review this transaction before broadcasting from your EVM account.',
      chainLabel: chain.networkLabel,
      address,
      payload: stringifyPayload(transaction),
    });
    return sendDappTransaction(
      wallet,
      permission.chainId,
      permission.accountIndex,
      permission.networkMode,
      transaction,
      vault.rpcPreferences,
      vault.customEvmChains,
    );
  }

  throw new Error(`Unsupported Ethereum provider method: ${request.method}.`);
}

async function handleRequest(request: RuntimeRequest): Promise<unknown> {
  if (request.type === 'dapp:approval:get') {
    const pending = pendingDappApprovals.get(request.id);
    if (!pending) return null;
    const { resolve: _resolve, timeout: _timeout, ...approval } = pending;
    return approval;
  }

  if (request.type === 'dapp:approval:resolve') {
    const pending = pendingDappApprovals.get(request.id);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingDappApprovals.delete(request.id);
      pending.resolve(request.approved);
    }
    return null;
  }

  if (request.type === 'wallet:generateSeed') {
    return generateSeedPhrase();
  }

  if (request.type === 'vault:get') {
    return buildDashboard();
  }

  if (request.type === 'wallet:status') {
    return getPageBridgeStatus();
  }

  if (request.type === 'vault:create') {
    return createVault(request.password, request.seedPhrase, request.name);
  }

  if (request.type === 'vault:unlock') {
    return unlock(request.password);
  }

  if (request.type === 'vault:lock') {
    sessionVault = null;
    sessionKey = null;
    sessionExpiresAt = null;
    return buildDashboard();
  }

  const vault = assertUnlocked();

  if (request.type === 'dapp:request') {
    return handleDappRequest(vault, request.request);
  }

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

  if (request.type === 'rpc:add') {
    const url = normalizeRpcUrl(request.url);
    await assertRpcHostPermission(url);
    vault.rpcPreferences = addRpcPreference(
      vault.rpcPreferences,
      request.chainId,
      request.networkMode,
      url,
      vault.customEvmChains,
    );
    await persistSession();
    return buildDashboard();
  }

  if (request.type === 'rpc:remove') {
    vault.rpcPreferences = removeRpcPreference(
      vault.rpcPreferences,
      request.chainId,
      request.networkMode,
      request.url,
      vault.customEvmChains,
    );
    await persistSession();
    return buildDashboard();
  }

  if (request.type === 'chain:removeCustom') {
    vault.customEvmChains = removeCustomEvmChain(
      vault.customEvmChains,
      request.chainId,
      request.networkMode,
    );
    vault.rpcPreferences = normalizeRpcPreferences(vault.rpcPreferences, vault.customEvmChains);
    vault.transactions = vault.transactions.filter((transaction) => transaction.chainId !== request.chainId);
    vault.dappPermissions = Object.fromEntries(
      Object.entries(vault.dappPermissions).filter(([, permission]) => permission.chainId !== request.chainId),
    );
    await persistSession();
    return buildDashboard();
  }

  if (request.type === 'wallet:refresh') {
    return buildDashboard();
  }

  if (request.type === 'send:quote') {
    const wallet = vault.wallets.find((candidate) => candidate.id === request.request.walletId);
    if (!wallet) throw new Error('Wallet not found.');
    return quoteSend(wallet, request.request, vault.networkMode, vault.rpcPreferences, vault.customEvmChains);
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
      const result = await broadcastSend(
        wallet,
        request.request,
        vault.networkMode,
        vault.rpcPreferences,
        vault.customEvmChains,
      );
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
    return executePrimitive(
      wallet,
      request.request,
      vault.networkMode,
      vault.rpcPreferences,
      vault.customEvmChains,
    );
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
