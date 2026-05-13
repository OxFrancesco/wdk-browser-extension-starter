import WDK from '@tetherto/wdk';
import WalletManagerBtc from '@tetherto/wdk-wallet-btc';
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import WalletManagerSolana from '@tetherto/wdk-wallet-solana';
import WalletManagerSpark from '@tetherto/wdk-wallet-spark';

import {
  CHAIN_ORDER,
  formatBaseUnits,
  getAsset,
  getChain,
  parseBaseUnits,
  withRpcPreferences,
} from './chains';
import type {
  AccountSnapshot,
  ChainConfig,
  ChainId,
  EvmChainId,
  NetworkMode,
  PrimitiveRequest,
  PrimitiveResult,
  RpcPreferences,
  SendQuote,
  SendRequest,
  VaultWallet,
  WdkPrimitiveDefinition,
} from './types';
import { validateRecipientAddress } from './validation';

type WdkAccount = {
  getAddress: () => Promise<string>;
  sign?: (message: string) => Promise<string>;
  verify?: (message: string, signature: string) => Promise<boolean>;
  getBalance?: () => Promise<bigint>;
  getTokenBalance?: (tokenAddress: string) => Promise<bigint>;
  getTokenBalances?: (tokenAddresses: string[]) => Promise<Record<string, bigint>>;
  quoteTransfer?: (options: unknown) => Promise<{ fee: bigint | number | string }>;
  getTransfers?: (options?: unknown) => Promise<unknown[]>;
  quoteSendTransaction?: (tx: unknown) => Promise<{ fee: bigint | number | string }>;
  sendTransaction?: (tx: unknown) => Promise<{ hash?: string; fee?: bigint | number | string }>;
  transfer?: (options: unknown) => Promise<{ hash?: string; fee?: bigint | number | string }>;
  getTransactionReceipt?: (hash: string) => Promise<unknown>;
  signTransaction?: (tx: unknown) => Promise<unknown>;
  signTypedData?: (typedData: unknown) => Promise<string>;
  verifyTypedData?: (typedData: unknown, signature: string) => Promise<boolean>;
  getAllowance?: (token: string, spender: string) => Promise<bigint>;
  approve?: (options: unknown) => Promise<{ hash?: string; fee?: bigint | number | string }>;
  getDelegation?: () => Promise<unknown>;
  signAuthorization?: (auth: unknown) => Promise<unknown>;
  delegate?: (delegateAddress: string) => Promise<{ hash?: string; fee?: bigint | number | string }>;
  revokeDelegation?: () => Promise<{ hash?: string; fee?: bigint | number | string }>;
  getMaxSpendable?: (options?: unknown) => Promise<unknown>;
  getIdentityKey?: () => Promise<string>;
  getUnusedDepositAddresses?: (options?: unknown) => Promise<unknown>;
  getStaticDepositAddresses?: () => Promise<unknown>;
  getUtxosForDepositAddress?: (options: unknown) => Promise<unknown>;
  getSparkInvoices?: (options: unknown) => Promise<unknown>;
  getSingleUseDepositAddress?: () => Promise<string>;
  getStaticDepositAddress?: () => Promise<string>;
  claimDeposit?: (txId: string) => Promise<unknown>;
  claimStaticDeposit?: (txId: string) => Promise<unknown>;
  refundStaticDeposit?: (options: unknown) => Promise<string>;
  quoteWithdraw?: (options: unknown) => Promise<unknown>;
  withdraw?: (options: unknown) => Promise<unknown>;
  createLightningInvoice?: (options: unknown) => Promise<unknown>;
  getLightningReceiveRequest?: (invoiceId: string) => Promise<unknown>;
  getLightningSendRequest?: (requestId: string) => Promise<unknown>;
  payLightningInvoice?: (options: unknown) => Promise<unknown>;
  quotePayLightningInvoice?: (options: unknown) => Promise<bigint>;
  createSparkSatsInvoice?: (options: unknown) => Promise<unknown>;
  createSparkTokensInvoice?: (options: unknown) => Promise<unknown>;
  paySparkInvoice?: (invoices: unknown[]) => Promise<unknown>;
  syncWalletBalance?: () => Promise<void>;
};

type Eip1193TransactionRequest = {
  from?: string;
  to?: string;
  value?: string | number | bigint;
  data?: string;
  input?: string;
  gas?: string | number | bigint;
  gasLimit?: string | number | bigint;
  gasPrice?: string | number | bigint;
  maxFeePerGas?: string | number | bigint;
  maxPriorityFeePerGas?: string | number | bigint;
  nonce?: string | number;
};

export const WDK_PRIMITIVES: WdkPrimitiveDefinition[] = [
  {
    id: 'core:generateSeedPhrase',
    label: 'Generate seed phrase',
    category: 'core',
    chains: CHAIN_ORDER,
    description: 'Generate a BIP-39 seed phrase through WDK.',
    payloadHint: '{"wordCount":12}',
  },
  {
    id: 'core:validateSeedPhrase',
    label: 'Validate seed phrase',
    category: 'core',
    chains: CHAIN_ORDER,
    description: 'Validate a BIP-39 seed phrase through WDK.',
    payloadHint: '{"seedPhrase":"..."}',
  },
  {
    id: 'core:getAccount',
    label: 'Get account',
    category: 'core',
    chains: CHAIN_ORDER,
    description: 'Derive a WDK account by index.',
    payloadHint: '{"index":0}',
  },
  {
    id: 'core:getAccountByPath',
    label: 'Get account by path',
    category: 'core',
    chains: CHAIN_ORDER,
    description: 'Derive an address from an explicit WDK derivation path.',
    payloadHint: "{\"path\":\"0'/0/0\"}",
  },
  {
    id: 'core:getFeeRates',
    label: 'Get fee rates',
    category: 'core',
    chains: CHAIN_ORDER,
    description: 'Read normal and fast fee rates through WDK.',
  },
  {
    id: 'wallet:getAddress',
    label: 'Get address',
    category: 'wallet',
    chains: CHAIN_ORDER,
    description: 'Return the active WDK account address.',
  },
  {
    id: 'wallet:getBalance',
    label: 'Get native balance',
    category: 'wallet',
    chains: CHAIN_ORDER,
    description: 'Read the native asset balance for the active account.',
  },
  {
    id: 'wallet:getTokenBalance',
    label: 'Get token balance',
    category: 'wallet',
    chains: CHAIN_ORDER,
    description: 'Read a token balance by contract or mint address.',
    payloadHint: '{"tokenAddress":"0x..."}',
  },
  {
    id: 'wallet:getTokenBalances',
    label: 'Get token balances',
    category: 'wallet',
    chains: ['ethereum', 'polygon', 'arbitrum', 'plasma', 'solana'],
    description: 'Read token balances for multiple contract or mint addresses.',
    payloadHint: '{"tokenAddresses":["0x..."]}',
  },
  {
    id: 'wallet:quoteSendTransaction',
    label: 'Quote native send',
    category: 'wallet',
    chains: CHAIN_ORDER,
    description: 'Estimate a native asset send.',
    payloadHint: '{"to":"address","value":"1000"}',
  },
  {
    id: 'wallet:quoteTransfer',
    label: 'Quote token transfer',
    category: 'wallet',
    chains: CHAIN_ORDER,
    description: 'Estimate a token transfer.',
    payloadHint: '{"token":"0x...","recipient":"address","amount":"1000"}',
  },
  {
    id: 'wallet:getTransactionReceipt',
    label: 'Get transaction receipt',
    category: 'wallet',
    chains: CHAIN_ORDER,
    description: 'Read a receipt/status object for a submitted transaction hash.',
    payloadHint: '{"hash":"0x..."}',
  },
  {
    id: 'wallet:getTransfers',
    label: 'Get transfers',
    category: 'wallet',
    chains: ['bitcoin', 'spark'],
    description: 'Read transfer history where the wallet module exposes it.',
    payloadHint: '{"direction":"all","limit":10,"skip":0}',
  },
  {
    id: 'wallet:signMessage',
    label: 'Sign message',
    category: 'wallet',
    chains: CHAIN_ORDER,
    description: 'Sign a message with the selected account inside the locked-down background runtime.',
    payloadHint: '{"message":"hello"}',
    mutates: true,
  },
  {
    id: 'wallet:verifyMessage',
    label: 'Verify message',
    category: 'wallet',
    chains: CHAIN_ORDER,
    description: 'Verify a message signature with the selected account.',
    payloadHint: '{"message":"hello","signature":"..."}',
  },
  {
    id: 'wallet:signTransaction',
    label: 'Sign transaction',
    category: 'wallet',
    chains: CHAIN_ORDER,
    description: 'Sign a wallet-module transaction payload without broadcasting.',
    payloadHint: '{"transaction":{"to":"address","value":"1000"}}',
    mutates: true,
  },
  {
    id: 'wallet:sendTransaction',
    label: 'Send transaction',
    category: 'wallet',
    chains: CHAIN_ORDER,
    description: 'Broadcast a native transaction payload through the selected WDK module.',
    payloadHint: '{"transaction":{"to":"address","value":"1000"}}',
    mutates: true,
  },
  {
    id: 'wallet:transfer',
    label: 'Transfer token',
    category: 'wallet',
    chains: CHAIN_ORDER,
    description: 'Broadcast a token transfer through the selected WDK module.',
    payloadHint: '{"token":"0x...","recipient":"address","amount":"1000"}',
    mutates: true,
  },
  {
    id: 'evm:signTypedData',
    label: 'EVM sign typed data',
    category: 'evm',
    chains: ['ethereum', 'polygon', 'arbitrum', 'plasma'],
    description: 'Sign EIP-712 typed data.',
    payloadHint: '{"domain":{},"types":{},"message":{}}',
    mutates: true,
  },
  {
    id: 'evm:verifyTypedData',
    label: 'EVM verify typed data',
    category: 'evm',
    chains: ['ethereum', 'polygon', 'arbitrum', 'plasma'],
    description: 'Verify an EIP-712 typed-data signature.',
    payloadHint: '{"typedData":{"domain":{},"types":{},"message":{}},"signature":"0x..."}',
  },
  {
    id: 'evm:getAllowance',
    label: 'EVM get allowance',
    category: 'evm',
    chains: ['ethereum', 'polygon', 'arbitrum', 'plasma'],
    description: 'Read token allowance for a spender.',
    payloadHint: '{"token":"0x...","spender":"0x..."}',
  },
  {
    id: 'evm:approve',
    label: 'EVM approve',
    category: 'evm',
    chains: ['ethereum', 'polygon', 'arbitrum', 'plasma'],
    description: 'Approve a spender for an ERC-20 style token.',
    payloadHint: '{"token":"0x...","spender":"0x...","amount":"1000"}',
    mutates: true,
  },
  {
    id: 'evm:getDelegation',
    label: 'EVM get delegation',
    category: 'evm',
    chains: ['ethereum', 'polygon', 'arbitrum', 'plasma'],
    description: 'Inspect ERC-7702 delegation state where supported.',
  },
  {
    id: 'evm:signAuthorization',
    label: 'EVM sign authorization',
    category: 'evm',
    chains: ['ethereum', 'polygon', 'arbitrum', 'plasma'],
    description: 'Sign an ERC-7702 authorization tuple.',
    payloadHint: '{"auth":{}}',
    mutates: true,
  },
  {
    id: 'evm:delegate',
    label: 'EVM delegate',
    category: 'evm',
    chains: ['ethereum', 'polygon', 'arbitrum', 'plasma'],
    description: 'Delegate the EOA to a contract with ERC-7702.',
    payloadHint: '{"delegateAddress":"0x..."}',
    mutates: true,
  },
  {
    id: 'evm:revokeDelegation',
    label: 'EVM revoke delegation',
    category: 'evm',
    chains: ['ethereum', 'polygon', 'arbitrum', 'plasma'],
    description: 'Revoke active ERC-7702 delegation.',
    mutates: true,
  },
  {
    id: 'bitcoin:getMaxSpendable',
    label: 'BTC max spendable',
    category: 'bitcoin',
    chains: ['bitcoin'],
    description: 'Estimate the maximum spendable Bitcoin amount.',
    payloadHint: '{"feeRate":"5"}',
  },
  {
    id: 'spark:getIdentityKey',
    label: 'Spark identity key',
    category: 'spark',
    chains: ['spark'],
    description: 'Read the Spark identity public key.',
  },
  {
    id: 'spark:getUnusedDepositAddresses',
    label: 'Spark unused deposit addresses',
    category: 'spark',
    chains: ['spark'],
    description: 'List unused Spark deposit addresses.',
    payloadHint: '{"limit":10,"offset":0}',
  },
  {
    id: 'spark:getStaticDepositAddresses',
    label: 'Spark static deposit addresses',
    category: 'spark',
    chains: ['spark'],
    description: 'List reusable Spark static deposit addresses.',
  },
  {
    id: 'spark:getUtxosForDepositAddress',
    label: 'Spark deposit UTXOs',
    category: 'spark',
    chains: ['spark'],
    description: 'Read confirmed UTXOs for a Spark deposit address.',
    payloadHint: '{"depositAddress":"bc1..."}',
  },
  {
    id: 'spark:getSparkInvoices',
    label: 'Spark invoice statuses',
    category: 'spark',
    chains: ['spark'],
    description: 'Query Spark invoice statuses.',
    payloadHint: '{}',
  },
  {
    id: 'spark:getSingleUseDepositAddress',
    label: 'Spark single-use deposit',
    category: 'spark',
    chains: ['spark'],
    description: 'Generate a single-use L1 Bitcoin deposit address.',
    mutates: true,
  },
  {
    id: 'spark:getStaticDepositAddress',
    label: 'Spark static deposit',
    category: 'spark',
    chains: ['spark'],
    description: 'Get or create a reusable static deposit address.',
    mutates: true,
  },
  {
    id: 'spark:claimDeposit',
    label: 'Spark claim deposit',
    category: 'spark',
    chains: ['spark'],
    description: 'Claim a single-use Spark deposit transaction.',
    payloadHint: '{"txId":"..."}',
    mutates: true,
  },
  {
    id: 'spark:claimStaticDeposit',
    label: 'Spark claim static deposit',
    category: 'spark',
    chains: ['spark'],
    description: 'Claim a static Spark deposit transaction.',
    payloadHint: '{"txId":"..."}',
    mutates: true,
  },
  {
    id: 'spark:refundStaticDeposit',
    label: 'Spark refund static deposit',
    category: 'spark',
    chains: ['spark'],
    description: 'Build a refund transaction for a static deposit.',
    payloadHint: '{"options":{}}',
    mutates: true,
  },
  {
    id: 'spark:quoteWithdraw',
    label: 'Spark quote withdraw',
    category: 'spark',
    chains: ['spark'],
    description: 'Quote cooperative exit withdrawal fees.',
    payloadHint: '{"options":{}}',
  },
  {
    id: 'spark:withdraw',
    label: 'Spark withdraw',
    category: 'spark',
    chains: ['spark'],
    description: 'Withdraw Spark funds to on-chain Bitcoin.',
    payloadHint: '{"options":{}}',
    mutates: true,
  },
  {
    id: 'spark:createLightningInvoice',
    label: 'Spark create Lightning invoice',
    category: 'spark',
    chains: ['spark'],
    description: 'Create a BOLT11 Lightning receive invoice.',
    payloadHint: '{"amountSats":100,"memo":"demo"}',
    mutates: true,
  },
  {
    id: 'spark:getLightningReceiveRequest',
    label: 'Spark get Lightning receive',
    category: 'spark',
    chains: ['spark'],
    description: 'Read a Lightning receive request by id.',
    payloadHint: '{"invoiceId":"..."}',
  },
  {
    id: 'spark:getLightningSendRequest',
    label: 'Spark get Lightning send',
    category: 'spark',
    chains: ['spark'],
    description: 'Read a Lightning send request by id.',
    payloadHint: '{"requestId":"..."}',
  },
  {
    id: 'spark:payLightningInvoice',
    label: 'Spark pay Lightning invoice',
    category: 'spark',
    chains: ['spark'],
    description: 'Pay a Lightning invoice.',
    payloadHint: '{"invoice":"lnbc..."}',
    mutates: true,
  },
  {
    id: 'spark:quotePayLightningInvoice',
    label: 'Spark quote Lightning pay',
    category: 'spark',
    chains: ['spark'],
    description: 'Estimate the fee for paying a Lightning invoice.',
    payloadHint: '{"invoice":"lnbc..."}',
  },
  {
    id: 'spark:createSparkSatsInvoice',
    label: 'Spark sats invoice',
    category: 'spark',
    chains: ['spark'],
    description: 'Create a Spark sats invoice.',
    payloadHint: '{"amountSats":100,"memo":"demo"}',
    mutates: true,
  },
  {
    id: 'spark:createSparkTokensInvoice',
    label: 'Spark token invoice',
    category: 'spark',
    chains: ['spark'],
    description: 'Create a Spark token invoice.',
    payloadHint: '{"tokenIdentifier":"...","amount":"1000"}',
    mutates: true,
  },
  {
    id: 'spark:paySparkInvoice',
    label: 'Spark pay invoice',
    category: 'spark',
    chains: ['spark'],
    description: 'Pay one or more Spark invoices.',
    payloadHint: '{"invoices":[]}',
    mutates: true,
  },
  {
    id: 'spark:syncWalletBalance',
    label: 'Spark sync balance',
    category: 'spark',
    chains: ['spark'],
    description: 'Reconcile Spark wallet state with the server.',
    mutates: true,
  },
];

function registerChain(wdk: WDK, chain: ChainConfig): void {
  if (chain.family === 'evm') {
    wdk.registerWallet(chain.id, WalletManagerEvm as never, {
      provider: chain.rpcUrls,
      chainId: chain.chainId,
    } as never);
    return;
  }

  if (chain.family === 'bitcoin') {
    wdk.registerWallet(chain.id, WalletManagerBtc as never, {
      network: chain.bitcoinNetwork ?? 'bitcoin',
      client: {
        type: 'blockbook-http',
        clientConfig: {
          url: chain.rpcUrls?.[0] ?? 'https://btc1.trezor.io/api',
        },
      },
    } as never);
    return;
  }

  if (chain.family === 'spark') {
    wdk.registerWallet(chain.id, WalletManagerSpark as never, {
      network: chain.sparkNetwork ?? 'MAINNET',
      syncAndRetry: true,
    } as never);
    return;
  }

  wdk.registerWallet(chain.id, WalletManagerSolana as never, {
    provider: chain.rpcUrls,
    commitment: 'confirmed',
  } as never);
}

function makeWdk(
  seedPhrase: string,
  networkMode: NetworkMode,
  rpcPreferences?: RpcPreferences,
): WDK {
  const wdk = new WDK(seedPhrase);

  for (const chainId of CHAIN_ORDER) {
    registerChain(wdk, withRpcPreferences(getChain(chainId, networkMode), rpcPreferences));
  }

  return wdk;
}

export function generateSeedPhrase(): string {
  return WDK.getRandomSeedPhrase(12);
}

export function assertValidSeedPhrase(seedPhrase: string): void {
  if (!WDK.isValidSeed(seedPhrase.trim())) {
    throw new Error('Seed phrase is not valid BIP-39.');
  }
}

async function withAccount<T>(
  wallet: VaultWallet,
  chainId: ChainId,
  accountIndex: number,
  networkMode: NetworkMode,
  rpcPreferences: RpcPreferences | undefined,
  callback: (account: WdkAccount, wdk: WDK) => Promise<T>,
): Promise<T> {
  const wdk = makeWdk(wallet.seedPhrase, networkMode, rpcPreferences);

  try {
    const account = (await wdk.getAccount(chainId, accountIndex)) as WdkAccount;
    return await callback(account, wdk);
  } finally {
    wdk.dispose();
  }
}

function parseHexQuantity(value: unknown): bigint | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value !== 'string') return undefined;
  return value.startsWith('0x') ? BigInt(value) : BigInt(value);
}

function parseHexNumber(value: unknown): number | undefined {
  const parsed = parseHexQuantity(value);
  return parsed === undefined ? undefined : Number(parsed);
}

function decodePersonalSignMessage(value: unknown): string {
  const message = String(value ?? '');
  if (!/^0x([0-9a-fA-F]{2})*$/.test(message)) return message;

  const bytes = new Uint8Array((message.length - 2) / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(message.slice(2 + index * 2, 4 + index * 2), 16);
  }

  try {
    return new TextDecoder().decode(bytes);
  } catch {
    return message;
  }
}

function normalizeEip1193Transaction(tx: Eip1193TransactionRequest) {
  const normalized: Record<string, unknown> = {
    ...tx,
    data: tx.data ?? tx.input,
  };

  const value = parseHexQuantity(tx.value);
  const gasLimit = parseHexQuantity(tx.gasLimit ?? tx.gas);
  const gasPrice = parseHexQuantity(tx.gasPrice);
  const maxFeePerGas = parseHexQuantity(tx.maxFeePerGas);
  const maxPriorityFeePerGas = parseHexQuantity(tx.maxPriorityFeePerGas);
  const nonce = parseHexNumber(tx.nonce);

  if (value !== undefined) normalized.value = value;
  if (gasLimit !== undefined) normalized.gasLimit = gasLimit;
  if (gasPrice !== undefined) normalized.gasPrice = gasPrice;
  if (maxFeePerGas !== undefined) normalized.maxFeePerGas = maxFeePerGas;
  if (maxPriorityFeePerGas !== undefined) normalized.maxPriorityFeePerGas = maxPriorityFeePerGas;
  if (nonce !== undefined) normalized.nonce = nonce;

  return normalized;
}

export async function getDappAccountAddress(
  wallet: VaultWallet,
  chainId: EvmChainId,
  accountIndex: number,
  networkMode: NetworkMode,
  rpcPreferences?: RpcPreferences,
): Promise<string> {
  return withAccount(wallet, chainId, accountIndex, networkMode, rpcPreferences, (account) =>
    account.getAddress(),
  );
}

export async function signDappMessage(
  wallet: VaultWallet,
  chainId: EvmChainId,
  accountIndex: number,
  networkMode: NetworkMode,
  message: unknown,
  rpcPreferences?: RpcPreferences,
): Promise<string> {
  return withAccount(wallet, chainId, accountIndex, networkMode, rpcPreferences, (account) =>
    requireMethod(account, 'sign').call(account, decodePersonalSignMessage(message)),
  );
}

export async function signDappTypedData(
  wallet: VaultWallet,
  chainId: EvmChainId,
  accountIndex: number,
  networkMode: NetworkMode,
  typedData: unknown,
  rpcPreferences?: RpcPreferences,
): Promise<string> {
  const parsedTypedData = typeof typedData === 'string' ? JSON.parse(typedData) : typedData;
  return withAccount(wallet, chainId, accountIndex, networkMode, rpcPreferences, (account) =>
    requireMethod(account, 'signTypedData').call(account, parsedTypedData),
  );
}

export async function sendDappTransaction(
  wallet: VaultWallet,
  chainId: EvmChainId,
  accountIndex: number,
  networkMode: NetworkMode,
  transaction: Eip1193TransactionRequest,
  rpcPreferences?: RpcPreferences,
): Promise<string> {
  const result = await withAccount(wallet, chainId, accountIndex, networkMode, rpcPreferences, (account) =>
    requireMethod(account, 'sendTransaction').call(account, normalizeEip1193Transaction(transaction)),
  );

  if (!result.hash) {
    throw new Error('The WDK EVM module did not return a transaction hash.');
  }

  return result.hash;
}

async function getBalance(account: WdkAccount, chain: ChainConfig, assetIndex: number) {
  const asset = chain.assets[assetIndex];

  try {
    const value =
      asset.kind === 'native'
        ? await account.getBalance?.()
        : asset.tokenAddress
          ? await account.getTokenBalance?.(asset.tokenAddress)
          : undefined;

    if (value === undefined) {
      return {
        assetId: asset.id,
        label: asset.label,
        value: '0',
        formatted: '0',
        error: 'Balance not exposed by this WDK wallet module yet.',
      };
    }

    return {
      assetId: asset.id,
      label: asset.label,
      value: value.toString(),
      formatted: formatBaseUnits(value, asset.decimals),
    };
  } catch (error) {
    return {
      assetId: asset.id,
      label: asset.label,
      value: '0',
      formatted: '0',
      error: error instanceof Error ? error.message : 'Unable to load balance.',
    };
  }
}

export async function getAccountSnapshot(
  wallet: VaultWallet,
  chainId: ChainId,
  accountIndex: number,
  networkMode: NetworkMode,
  rpcPreferences?: RpcPreferences,
): Promise<AccountSnapshot> {
  const chain = withRpcPreferences(getChain(chainId, networkMode), rpcPreferences);

  return withAccount(wallet, chainId, accountIndex, networkMode, rpcPreferences, async (account, wdk) => {
    let feeRates: AccountSnapshot['feeRates'];

    try {
      const rates = await wdk.getFeeRates(chainId);
      feeRates = { normal: rates.normal.toString(), fast: rates.fast.toString() };
    } catch {
      feeRates = undefined;
    }

    return {
      walletId: wallet.id,
      walletName: wallet.name,
      accountIndex,
      chainId,
      chainLabel: chain.label,
      networkMode,
      networkLabel: chain.networkLabel,
      address: await account.getAddress(),
      balances: await Promise.all(chain.assets.map((_, index) => getBalance(account, chain, index))),
      feeRates,
    };
  }).catch((error) => ({
    walletId: wallet.id,
    walletName: wallet.name,
    accountIndex,
    chainId,
    chainLabel: chain.label,
    networkMode,
    networkLabel: chain.networkLabel,
    address: '',
    balances: chain.assets.map((asset) => ({
      assetId: asset.id,
      label: asset.label,
      value: '0',
      formatted: '0',
      error: 'Unavailable',
    })),
    error: error instanceof Error ? error.message : 'Unable to derive account.',
  }));
}

export async function quoteSend(
  wallet: VaultWallet,
  request: SendRequest,
  networkMode: NetworkMode,
  rpcPreferences?: RpcPreferences,
): Promise<SendQuote> {
  const chain = withRpcPreferences(getChain(request.chainId, networkMode), rpcPreferences);
  const asset = getAsset(request.chainId, request.assetId, networkMode);
  const recipient = validateRecipientAddress(request.chainId, request.to, networkMode);

  if (!chain.canSend) {
    return {
      fee: '0',
      formattedFee: '0',
      canBroadcast: false,
      warning: chain.statusNote ?? `${chain.networkLabel} needs an RPC configuration before live broadcasts are enabled.`,
    };
  }

  const amount = parseBaseUnits(request.amount, asset.decimals);

  return withAccount(wallet, request.chainId, request.accountIndex, networkMode, rpcPreferences, async (account) => {
    const tx =
      chain.family === 'evm'
        ? { to: recipient, value: amount }
        : { to: recipient, value: amount };

    if (asset.kind === 'token') {
      if (!account.transfer || !asset.tokenAddress) {
        return {
          fee: '0',
          formattedFee: '0',
          canBroadcast: false,
          warning: 'This token transfer is not exposed by the selected WDK module.',
        };
      }

      return {
        fee: '0',
        formattedFee: '0',
        canBroadcast: true,
        warning: 'Token transfer fees are estimated during broadcast by the WDK wallet module.',
      };
    }

    if (!account.quoteSendTransaction) {
      return {
        fee: '0',
        formattedFee: '0',
        canBroadcast: false,
        warning: 'This WDK account does not expose transaction quoting yet.',
      };
    }

    const quote = await account.quoteSendTransaction(tx);
    const fee = BigInt(quote.fee);
    return {
      fee: fee.toString(),
      formattedFee: formatBaseUnits(fee, asset.decimals),
      canBroadcast: true,
    };
  });
}

export async function broadcastSend(
  wallet: VaultWallet,
  request: SendRequest,
  networkMode: NetworkMode,
  rpcPreferences?: RpcPreferences,
): Promise<{ hash?: string; fee?: string }> {
  const chain = withRpcPreferences(getChain(request.chainId, networkMode), rpcPreferences);
  const asset = getAsset(request.chainId, request.assetId, networkMode);
  const amount = parseBaseUnits(request.amount, asset.decimals);
  const recipient = validateRecipientAddress(request.chainId, request.to, networkMode);

  if (!chain.canSend) {
    throw new Error(chain.statusNote ?? `${chain.networkLabel} does not have live broadcast configuration.`);
  }

  return withAccount(wallet, request.chainId, request.accountIndex, networkMode, rpcPreferences, async (account) => {
    const result =
      asset.kind === 'token'
        ? await account.transfer?.({
            token: asset.tokenAddress,
            recipient,
            amount,
          })
        : await account.sendTransaction?.({
            to: recipient,
            value: amount,
          });

    if (!result) {
      throw new Error('The selected WDK account cannot broadcast this transaction.');
    }

    return {
      hash: result.hash,
      fee: result.fee === undefined ? undefined : BigInt(result.fee).toString(),
    };
  });
}

function parsePrimitivePayload(payload: string): Record<string, unknown> {
  const trimmed = payload.trim();
  if (!trimmed) return {};

  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Primitive payload must be a JSON object.');
  }

  return coercePrimitiveNumbers(parsed as Record<string, unknown>);
}

function coercePrimitiveNumbers(value: Record<string, unknown>): Record<string, unknown> {
  const bigintKeys = new Set([
    'amount',
    'value',
    'fee',
    'feeRate',
    'gasLimit',
    'gasPrice',
    'maxFeePerGas',
    'maxPriorityFeePerGas',
    'tokenInAmount',
    'tokenOutAmount',
    'cryptoAmount',
    'fiatAmount',
  ]);

  return Object.fromEntries(
    Object.entries(value).map(([key, current]) => {
      if (typeof current === 'string' && bigintKeys.has(key) && /^\d+$/.test(current)) {
        return [key, BigInt(current)];
      }

      if (current && typeof current === 'object' && !Array.isArray(current)) {
        return [key, coercePrimitiveNumbers(current as Record<string, unknown>)];
      }

      if (Array.isArray(current)) {
        return [
          key,
          current.map((item) =>
            item && typeof item === 'object' && !Array.isArray(item)
              ? coercePrimitiveNumbers(item as Record<string, unknown>)
              : item,
          ),
        ];
      }

      return [key, current];
    }),
  );
}

function serializePrimitiveResult(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, current) => {
      if (typeof current === 'bigint') return current.toString();
      if (current instanceof Uint8Array) return Array.from(current);
      return current;
    },
    2,
  );
}

function getPrimitiveStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function requireMethod<K extends keyof WdkAccount>(
  account: WdkAccount,
  method: K,
): NonNullable<WdkAccount[K]> {
  const value = account[method];
  if (typeof value !== 'function') {
    throw new Error(`${String(method)} is not exposed by this WDK account module.`);
  }
  return value as NonNullable<WdkAccount[K]>;
}

export function getPrimitiveDefinitions(chainId?: ChainId): WdkPrimitiveDefinition[] {
  if (!chainId) return WDK_PRIMITIVES;
  return WDK_PRIMITIVES.filter((primitive) => primitive.chains.includes(chainId));
}

export async function executePrimitive(
  wallet: VaultWallet,
  request: PrimitiveRequest,
  networkMode: NetworkMode,
  rpcPreferences?: RpcPreferences,
): Promise<PrimitiveResult> {
  const primitive = WDK_PRIMITIVES.find((candidate) => candidate.id === request.operationId);
  if (!primitive) throw new Error('Unsupported WDK primitive.');
  if (!primitive.chains.includes(request.chainId)) {
    throw new Error(`${primitive.label} is not available for ${getChain(request.chainId, networkMode).label}.`);
  }

  const payload = parsePrimitivePayload(request.payload);
  const result = await withAccount(
    wallet,
    request.chainId,
    request.accountIndex,
    networkMode,
    rpcPreferences,
    async (account, wdk) => {
      switch (request.operationId) {
        case 'core:generateSeedPhrase': {
          const wordCount = Number(payload.wordCount ?? 12) === 24 ? 24 : 12;
          return { seedPhrase: WDK.getRandomSeedPhrase(wordCount) };
        }
        case 'core:validateSeedPhrase':
          return { valid: WDK.isValidSeed(String(payload.seedPhrase ?? payload.seed ?? '')) };
        case 'core:getAccount': {
          const index = Number(payload.index ?? request.accountIndex);
          if (!Number.isInteger(index) || index < 0) throw new Error('Payload index must be a non-negative integer.');
          const derived = (await wdk.getAccount(request.chainId, index)) as WdkAccount & {
            path?: string;
            index?: number;
          };
          return {
            address: await derived.getAddress(),
            path: derived.path,
            index: derived.index,
          };
        }
        case 'core:getAccountByPath': {
          const path = String(payload.path ?? '');
          if (!path) throw new Error('Payload requires path.');
          const derived = (await wdk.getAccountByPath(request.chainId, path)) as WdkAccount & {
            path?: string;
            index?: number;
          };
          return {
            address: await derived.getAddress(),
            path: derived.path,
            index: derived.index,
          };
        }
        case 'core:getFeeRates':
          return wdk.getFeeRates(request.chainId);
        case 'wallet:getAddress':
          return account.getAddress();
        case 'wallet:getBalance':
          return requireMethod(account, 'getBalance').call(account);
        case 'wallet:getTokenBalance':
          return requireMethod(account, 'getTokenBalance').call(account, String(payload.tokenAddress ?? payload.token ?? ''));
        case 'wallet:getTokenBalances': {
          const tokenAddresses = getPrimitiveStringList(payload.tokenAddresses ?? payload.tokens ?? payload.tokenAddress);
          if (tokenAddresses.length === 0) throw new Error('Payload requires tokenAddresses.');
          return requireMethod(account, 'getTokenBalances').call(account, tokenAddresses);
        }
        case 'wallet:quoteSendTransaction':
          return requireMethod(account, 'quoteSendTransaction').call(account, payload.transaction ?? payload);
        case 'wallet:quoteTransfer':
          return requireMethod(account, 'quoteTransfer').call(account, payload.options ?? payload);
        case 'wallet:getTransactionReceipt':
          return requireMethod(account, 'getTransactionReceipt').call(account, String(payload.hash ?? ''));
        case 'wallet:getTransfers':
          return requireMethod(account, 'getTransfers').call(account, payload);
        case 'wallet:signMessage':
          return requireMethod(account, 'sign').call(account, String(payload.message ?? ''));
        case 'wallet:verifyMessage':
          return requireMethod(account, 'verify').call(
            account,
            String(payload.message ?? ''),
            String(payload.signature ?? ''),
          );
        case 'wallet:signTransaction':
          return requireMethod(account, 'signTransaction').call(account, payload.transaction ?? payload);
        case 'wallet:sendTransaction':
          return requireMethod(account, 'sendTransaction').call(account, payload.transaction ?? payload);
        case 'wallet:transfer':
          return requireMethod(account, 'transfer').call(account, payload.options ?? payload);
        case 'evm:signTypedData':
          return requireMethod(account, 'signTypedData').call(account, payload.typedData ?? payload);
        case 'evm:verifyTypedData':
          return requireMethod(account, 'verifyTypedData').call(
            account,
            payload.typedData,
            String(payload.signature ?? ''),
          );
        case 'evm:getAllowance':
          return requireMethod(account, 'getAllowance').call(
            account,
            String(payload.token ?? ''),
            String(payload.spender ?? ''),
          );
        case 'evm:approve':
          return requireMethod(account, 'approve').call(account, payload.options ?? payload);
        case 'evm:getDelegation':
          return requireMethod(account, 'getDelegation').call(account);
        case 'evm:signAuthorization':
          return requireMethod(account, 'signAuthorization').call(account, payload.auth ?? payload);
        case 'evm:delegate':
          return requireMethod(account, 'delegate').call(account, String(payload.delegateAddress ?? ''));
        case 'evm:revokeDelegation':
          return requireMethod(account, 'revokeDelegation').call(account);
        case 'bitcoin:getMaxSpendable':
          return requireMethod(account, 'getMaxSpendable').call(account, payload);
        case 'spark:getIdentityKey':
          return requireMethod(account, 'getIdentityKey').call(account);
        case 'spark:getUnusedDepositAddresses':
          return requireMethod(account, 'getUnusedDepositAddresses').call(account, payload);
        case 'spark:getStaticDepositAddresses':
          return requireMethod(account, 'getStaticDepositAddresses').call(account);
        case 'spark:getUtxosForDepositAddress':
          return requireMethod(account, 'getUtxosForDepositAddress').call(account, payload.options ?? payload);
        case 'spark:getSparkInvoices':
          return requireMethod(account, 'getSparkInvoices').call(account, payload.options ?? payload);
        case 'spark:getSingleUseDepositAddress':
          return requireMethod(account, 'getSingleUseDepositAddress').call(account);
        case 'spark:getStaticDepositAddress':
          return requireMethod(account, 'getStaticDepositAddress').call(account);
        case 'spark:claimDeposit':
          return requireMethod(account, 'claimDeposit').call(account, String(payload.txId ?? ''));
        case 'spark:claimStaticDeposit':
          return requireMethod(account, 'claimStaticDeposit').call(account, String(payload.txId ?? ''));
        case 'spark:refundStaticDeposit':
          return requireMethod(account, 'refundStaticDeposit').call(account, payload.options ?? payload);
        case 'spark:quoteWithdraw':
          return requireMethod(account, 'quoteWithdraw').call(account, payload.options ?? payload);
        case 'spark:withdraw':
          return requireMethod(account, 'withdraw').call(account, payload.options ?? payload);
        case 'spark:createLightningInvoice':
          return requireMethod(account, 'createLightningInvoice').call(account, payload.options ?? payload);
        case 'spark:getLightningReceiveRequest':
          return requireMethod(account, 'getLightningReceiveRequest').call(account, String(payload.invoiceId ?? ''));
        case 'spark:getLightningSendRequest':
          return requireMethod(account, 'getLightningSendRequest').call(account, String(payload.requestId ?? ''));
        case 'spark:payLightningInvoice':
          return requireMethod(account, 'payLightningInvoice').call(account, payload.options ?? payload);
        case 'spark:quotePayLightningInvoice':
          return requireMethod(account, 'quotePayLightningInvoice').call(account, payload.options ?? payload);
        case 'spark:createSparkSatsInvoice':
          return requireMethod(account, 'createSparkSatsInvoice').call(account, payload.options ?? payload);
        case 'spark:createSparkTokensInvoice':
          return requireMethod(account, 'createSparkTokensInvoice').call(account, payload.options ?? payload);
        case 'spark:paySparkInvoice':
          return requireMethod(account, 'paySparkInvoice').call(
            account,
            Array.isArray(payload.invoices) ? payload.invoices : [],
          );
        case 'spark:syncWalletBalance':
          await requireMethod(account, 'syncWalletBalance').call(account);
          return { ok: true };
        default:
          throw new Error('Unsupported WDK primitive.');
      }
    },
  );

  return {
    operationId: primitive.id,
    label: primitive.label,
    result: serializePrimitiveResult(result),
  };
}
