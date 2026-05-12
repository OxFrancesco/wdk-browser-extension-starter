import WDK from '@tetherto/wdk';
import WalletManagerBtc from '@tetherto/wdk-wallet-btc';
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import WalletManagerSolana from '@tetherto/wdk-wallet-solana';
import WalletManagerSpark from '@tetherto/wdk-wallet-spark';

import { CHAINS, CHAIN_ORDER, formatBaseUnits, getAsset, parseBaseUnits } from './chains';
import type {
  AccountSnapshot,
  ChainConfig,
  ChainId,
  SendQuote,
  SendRequest,
  VaultWallet,
} from './types';
import { validateRecipientAddress } from './validation';

type WdkAccount = {
  getAddress: () => Promise<string>;
  getBalance?: () => Promise<bigint>;
  getTokenBalance?: (tokenAddress: string) => Promise<bigint>;
  getTransfers?: (options?: unknown) => Promise<unknown[]>;
  quoteSendTransaction?: (tx: unknown) => Promise<{ fee: bigint | number | string }>;
  sendTransaction?: (tx: unknown) => Promise<{ hash?: string; fee?: bigint | number | string }>;
  transfer?: (options: unknown) => Promise<{ hash?: string; fee?: bigint | number | string }>;
};

function registerChain(wdk: WDK, chain: ChainConfig): void {
  if (chain.family === 'evm') {
    wdk.registerWallet(chain.id, WalletManagerEvm as never, {
      provider: chain.rpcUrl ? [chain.rpcUrl] : undefined,
      chainId: chain.chainId,
    } as never);
    return;
  }

  if (chain.family === 'bitcoin') {
    wdk.registerWallet(chain.id, WalletManagerBtc as never, {
      network: 'bitcoin',
      client: {
        type: 'blockbook-http',
        clientConfig: { url: 'https://btc1.trezor.io/api' },
      },
    } as never);
    return;
  }

  if (chain.family === 'spark') {
    wdk.registerWallet(chain.id, WalletManagerSpark as never, {
      network: 'MAINNET',
    } as never);
    return;
  }

  wdk.registerWallet(chain.id, WalletManagerSolana as never, {
    provider: chain.rpcUrl,
    commitment: 'confirmed',
  } as never);
}

function makeWdk(seedPhrase: string): WDK {
  const wdk = new WDK(seedPhrase);

  for (const chainId of CHAIN_ORDER) {
    registerChain(wdk, CHAINS[chainId]);
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
  callback: (account: WdkAccount, wdk: WDK) => Promise<T>,
): Promise<T> {
  const wdk = makeWdk(wallet.seedPhrase);

  try {
    const account = (await wdk.getAccount(chainId, accountIndex)) as WdkAccount;
    return await callback(account, wdk);
  } finally {
    wdk.dispose();
  }
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
): Promise<AccountSnapshot> {
  const chain = CHAINS[chainId];

  return withAccount(wallet, chainId, accountIndex, async (account, wdk) => {
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

export async function quoteSend(wallet: VaultWallet, request: SendRequest): Promise<SendQuote> {
  const chain = CHAINS[request.chainId];
  const asset = getAsset(request.chainId, request.assetId);
  const recipient = validateRecipientAddress(request.chainId, request.to);

  if (!chain.canSend) {
    return {
      fee: '0',
      formattedFee: '0',
      canBroadcast: false,
      warning: `${chain.label} needs an RPC configuration before live broadcasts are enabled.`,
    };
  }

  const amount = parseBaseUnits(request.amount, asset.decimals);

  return withAccount(wallet, request.chainId, request.accountIndex, async (account) => {
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
): Promise<{ hash?: string; fee?: string }> {
  const chain = CHAINS[request.chainId];
  const asset = getAsset(request.chainId, request.assetId);
  const amount = parseBaseUnits(request.amount, asset.decimals);
  const recipient = validateRecipientAddress(request.chainId, request.to);

  if (!chain.canSend) {
    throw new Error(`${chain.label} does not have live broadcast configuration.`);
  }

  return withAccount(wallet, request.chainId, request.accountIndex, async (account) => {
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
