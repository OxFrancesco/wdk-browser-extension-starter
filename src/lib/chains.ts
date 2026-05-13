import type {
  AssetConfig,
  AssetId,
  ChainConfig,
  ChainId,
  NetworkMode,
  RpcPreferences,
} from './types';

const MAX_CUSTOM_RPC_URLS_PER_CHAIN = 5;
const NETWORK_MODES: NetworkMode[] = ['mainnet', 'testnet'];

const btcAsset: AssetConfig = {
  id: 'BTC',
  label: 'Bitcoin',
  decimals: 8,
  kind: 'native',
};

const usdtOnBitcoin: AssetConfig = {
  id: 'USDT',
  label: 'USDt',
  decimals: 8,
  kind: 'token',
};

const ethAsset: AssetConfig = {
  id: 'ETH',
  label: 'Ether',
  decimals: 18,
  kind: 'native',
};

const solAsset: AssetConfig = {
  id: 'SOL',
  label: 'Solana',
  decimals: 9,
  kind: 'native',
};

const usdtOnEthereum: AssetConfig = {
  id: 'USDT',
  label: 'USDt',
  decimals: 6,
  kind: 'token',
  tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
};

const xautOnEthereum: AssetConfig = {
  id: 'XAUT',
  label: 'XAUt',
  decimals: 6,
  kind: 'token',
  tokenAddress: '0x68749665FF8D2d112Fa859AA293F07A622782F38',
};

const usdtOnPolygon: AssetConfig = {
  id: 'USDT',
  label: 'USDt',
  decimals: 6,
  kind: 'token',
  tokenAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
};

const usdtOnArbitrum: AssetConfig = {
  id: 'USDT',
  label: 'USDt',
  decimals: 6,
  kind: 'token',
  tokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
};

const usdtOnSolana: AssetConfig = {
  id: 'USDT',
  label: 'USDt',
  decimals: 6,
  kind: 'token',
  tokenAddress: 'Es9vMFrzaCERmJfrF4H2FYD4kConky11McCe8BenwNYB',
};

const testUsdt: AssetConfig = {
  id: 'USDT',
  label: 'Test USDt',
  decimals: 6,
  kind: 'token',
};

export const CHAIN_ORDER: ChainId[] = [
  'bitcoin',
  'spark',
  'ethereum',
  'polygon',
  'arbitrum',
  'plasma',
  'solana',
];

export const CHAINS: Record<NetworkMode, Record<ChainId, ChainConfig>> = {
  mainnet: {
    bitcoin: {
      id: 'bitcoin',
      label: 'Bitcoin',
      networkLabel: 'Bitcoin Mainnet',
      networkMode: 'mainnet',
      family: 'bitcoin',
      bitcoinNetwork: 'bitcoin',
      rpcUrls: ['https://btc1.trezor.io/api'],
      explorerTx: 'https://mempool.space/tx/',
      assets: [btcAsset, usdtOnBitcoin],
      canSend: true,
    },
    spark: {
      id: 'spark',
      label: 'Lightning (Spark)',
      networkLabel: 'Spark Mainnet',
      networkMode: 'mainnet',
      family: 'spark',
      sparkNetwork: 'MAINNET',
      assets: [btcAsset],
      canSend: true,
    },
    ethereum: {
      id: 'ethereum',
      label: 'Ethereum',
      networkLabel: 'Ethereum Mainnet',
      networkMode: 'mainnet',
      family: 'evm',
      chainId: 1,
      rpcUrls: ['https://eth.llamarpc.com', 'https://ethereum-rpc.publicnode.com'],
      explorerTx: 'https://etherscan.io/tx/',
      assets: [ethAsset, usdtOnEthereum, xautOnEthereum],
      canSend: true,
    },
    polygon: {
      id: 'polygon',
      label: 'Polygon',
      networkLabel: 'Polygon Mainnet',
      networkMode: 'mainnet',
      family: 'evm',
      chainId: 137,
      rpcUrls: ['https://polygon-rpc.com', 'https://polygon-bor-rpc.publicnode.com'],
      explorerTx: 'https://polygonscan.com/tx/',
      assets: [{ id: 'POL', label: 'POL', decimals: 18, kind: 'native' }, usdtOnPolygon],
      canSend: true,
    },
    arbitrum: {
      id: 'arbitrum',
      label: 'Arbitrum',
      networkLabel: 'Arbitrum One',
      networkMode: 'mainnet',
      family: 'evm',
      chainId: 42161,
      rpcUrls: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum-one-rpc.publicnode.com'],
      explorerTx: 'https://arbiscan.io/tx/',
      assets: [
        { id: 'ARB', label: 'ETH on Arbitrum', decimals: 18, kind: 'native' },
        usdtOnArbitrum,
      ],
      canSend: true,
    },
    plasma: {
      id: 'plasma',
      label: 'Plasma',
      networkLabel: 'Plasma Mainnet Beta',
      networkMode: 'mainnet',
      family: 'evm',
      chainId: 9745,
      rpcUrls: ['https://rpc.plasma.to'],
      explorerTx: 'https://plasmascan.to/tx/',
      assets: [
        { id: 'XPL', label: 'XPL', decimals: 18, kind: 'native' },
        {
          id: 'USDT',
          label: 'USDT0',
          decimals: 6,
          kind: 'token',
          tokenAddress: '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb',
        },
      ],
      canSend: true,
      statusNote: 'Public Plasma RPC endpoints are rate-limited; production wallets should configure dedicated RPC access.',
    },
    solana: {
      id: 'solana',
      label: 'Solana',
      networkLabel: 'Solana Mainnet Beta',
      networkMode: 'mainnet',
      family: 'solana',
      rpcUrls: ['https://api.mainnet-beta.solana.com'],
      explorerTx: 'https://solscan.io/tx/',
      assets: [solAsset, usdtOnSolana],
      canSend: true,
    },
  },
  testnet: {
    bitcoin: {
      id: 'bitcoin',
      label: 'Bitcoin',
      networkLabel: 'Bitcoin Testnet',
      networkMode: 'testnet',
      family: 'bitcoin',
      bitcoinNetwork: 'testnet',
      rpcUrls: ['https://tbtc1.trezor.io/api'],
      explorerTx: 'https://mempool.space/testnet/tx/',
      assets: [btcAsset, usdtOnBitcoin],
      canSend: true,
    },
    spark: {
      id: 'spark',
      label: 'Lightning (Spark)',
      networkLabel: 'Spark Regtest',
      networkMode: 'testnet',
      family: 'spark',
      sparkNetwork: 'REGTEST',
      assets: [btcAsset],
      canSend: true,
      statusNote: 'Spark test mode maps to the WDK REGTEST network and requires compatible Spark infrastructure.',
    },
    ethereum: {
      id: 'ethereum',
      label: 'Ethereum',
      networkLabel: 'Ethereum Sepolia',
      networkMode: 'testnet',
      family: 'evm',
      chainId: 11155111,
      rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.org'],
      explorerTx: 'https://sepolia.etherscan.io/tx/',
      assets: [ethAsset, testUsdt],
      canSend: true,
    },
    polygon: {
      id: 'polygon',
      label: 'Polygon',
      networkLabel: 'Polygon Amoy',
      networkMode: 'testnet',
      family: 'evm',
      chainId: 80002,
      rpcUrls: ['https://polygon-amoy-bor-rpc.publicnode.com', 'https://rpc-amoy.polygon.technology'],
      explorerTx: 'https://amoy.polygonscan.com/tx/',
      assets: [{ id: 'POL', label: 'POL', decimals: 18, kind: 'native' }, testUsdt],
      canSend: true,
    },
    arbitrum: {
      id: 'arbitrum',
      label: 'Arbitrum',
      networkLabel: 'Arbitrum Sepolia',
      networkMode: 'testnet',
      family: 'evm',
      chainId: 421614,
      rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc', 'https://arbitrum-sepolia-rpc.publicnode.com'],
      explorerTx: 'https://sepolia.arbiscan.io/tx/',
      assets: [{ id: 'ARB', label: 'ETH on Arbitrum', decimals: 18, kind: 'native' }, testUsdt],
      canSend: true,
    },
    plasma: {
      id: 'plasma',
      label: 'Plasma',
      networkLabel: 'Plasma Testnet',
      networkMode: 'testnet',
      family: 'evm',
      chainId: 9746,
      rpcUrls: ['https://testnet-rpc.plasma.to'],
      explorerTx: 'https://testnet.plasmascan.to/tx/',
      assets: [
        { id: 'XPL', label: 'Test XPL', decimals: 18, kind: 'native' },
        { id: 'USDT', label: 'Test USDt', decimals: 6, kind: 'token' },
      ],
      canSend: true,
      statusNote: 'Test USDt needs a configured token contract address before token transfers are enabled.',
    },
    solana: {
      id: 'solana',
      label: 'Solana',
      networkLabel: 'Solana Devnet',
      networkMode: 'testnet',
      family: 'solana',
      rpcUrls: ['https://api.devnet.solana.com'],
      explorerTx: 'https://solscan.io/tx/',
      assets: [solAsset, testUsdt],
      canSend: true,
    },
  },
};

export function getChain(chainId: ChainId, networkMode: NetworkMode): ChainConfig {
  return CHAINS[networkMode][chainId];
}

export function getChains(networkMode: NetworkMode): Record<ChainId, ChainConfig> {
  return CHAINS[networkMode];
}

export function supportsCustomRpc(chain: ChainConfig): boolean {
  return chain.family === 'bitcoin' || chain.family === 'evm' || chain.family === 'solana';
}

export function normalizeRpcUrl(url: string): string {
  const trimmed = url.trim();

  if (!trimmed || trimmed.length > 512) {
    throw new Error('Enter a valid HTTPS RPC URL.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Enter a valid HTTPS RPC URL.');
  }

  if (parsed.protocol !== 'https:' || !parsed.hostname) {
    throw new Error('Custom RPC URLs must use HTTPS.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Custom RPC URLs cannot include embedded credentials.');
  }

  parsed.hash = '';
  return parsed.toString();
}

export function rpcPermissionPattern(url: string): string {
  const parsed = new URL(normalizeRpcUrl(url));
  return `${parsed.origin}/*`;
}

export function getBuiltinRpcUrls(chainId: ChainId, networkMode: NetworkMode): string[] {
  return getChain(chainId, networkMode).rpcUrls ?? [];
}

export function normalizeRpcPreferences(
  preferences: RpcPreferences | undefined,
): RpcPreferences {
  const normalized: RpcPreferences = {};

  for (const networkMode of NETWORK_MODES) {
    for (const chainId of CHAIN_ORDER) {
      const chain = getChain(chainId, networkMode);
      if (!supportsCustomRpc(chain)) continue;

      const urls = preferences?.[networkMode]?.[chainId] ?? [];
      const cleanUrls = [...new Set(urls.map((url) => {
        try {
          return normalizeRpcUrl(url);
        } catch {
          return '';
        }
      }).filter(Boolean))].slice(0, MAX_CUSTOM_RPC_URLS_PER_CHAIN);

      if (cleanUrls.length) {
        normalized[networkMode] = {
          ...normalized[networkMode],
          [chainId]: cleanUrls,
        };
      }
    }
  }

  return normalized;
}

export function getCustomRpcUrls(
  preferences: RpcPreferences | undefined,
  chainId: ChainId,
  networkMode: NetworkMode,
): string[] {
  return normalizeRpcPreferences(preferences)[networkMode]?.[chainId] ?? [];
}

export function getEffectiveRpcUrls(
  chainId: ChainId,
  networkMode: NetworkMode,
  preferences?: RpcPreferences,
): string[] {
  return [
    ...new Set([
      ...getCustomRpcUrls(preferences, chainId, networkMode),
      ...getBuiltinRpcUrls(chainId, networkMode),
    ]),
  ];
}

export function addRpcPreference(
  preferences: RpcPreferences | undefined,
  chainId: ChainId,
  networkMode: NetworkMode,
  url: string,
): RpcPreferences {
  const chain = getChain(chainId, networkMode);
  if (!supportsCustomRpc(chain)) {
    throw new Error(`${chain.label} does not expose a configurable RPC endpoint.`);
  }

  const normalizedUrl = normalizeRpcUrl(url);
  const current = getCustomRpcUrls(preferences, chainId, networkMode);

  if (current.includes(normalizedUrl)) {
    return normalizeRpcPreferences(preferences);
  }

  if (current.length >= MAX_CUSTOM_RPC_URLS_PER_CHAIN) {
    throw new Error(`Keep at most ${MAX_CUSTOM_RPC_URLS_PER_CHAIN} custom RPC URLs per chain.`);
  }

  return normalizeRpcPreferences({
    ...preferences,
    [networkMode]: {
      ...preferences?.[networkMode],
      [chainId]: [normalizedUrl, ...current],
    },
  });
}

export function removeRpcPreference(
  preferences: RpcPreferences | undefined,
  chainId: ChainId,
  networkMode: NetworkMode,
  url: string,
): RpcPreferences {
  const normalizedUrl = normalizeRpcUrl(url);
  const current = getCustomRpcUrls(preferences, chainId, networkMode);

  return normalizeRpcPreferences({
    ...preferences,
    [networkMode]: {
      ...preferences?.[networkMode],
      [chainId]: current.filter((candidate) => candidate !== normalizedUrl),
    },
  });
}

export function withRpcPreferences(
  chain: ChainConfig,
  preferences?: RpcPreferences,
): ChainConfig {
  const rpcUrls = getEffectiveRpcUrls(chain.id, chain.networkMode, preferences);
  return rpcUrls.length ? { ...chain, rpcUrls } : chain;
}

export function getAsset(chainId: ChainId, assetId: AssetId, networkMode: NetworkMode): AssetConfig {
  const chain = getChain(chainId, networkMode);
  const asset = chain.assets.find((candidate) => candidate.id === assetId);

  if (!asset) {
    throw new Error(`${assetId} is not supported on ${chain.networkLabel}.`);
  }

  return asset;
}

export function formatBaseUnits(value: string | bigint, decimals: number): string {
  const amount = typeof value === 'bigint' ? value : BigInt(value || '0');
  const sign = amount < 0n ? '-' : '';
  const absolute = amount < 0n ? -amount : amount;
  const scale = 10n ** BigInt(decimals);
  const whole = absolute / scale;
  const fraction = absolute % scale;
  const fractionText = fraction
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '')
    .slice(0, 8);

  return fractionText ? `${sign}${whole}.${fractionText}` : `${sign}${whole}`;
}

export function parseBaseUnits(value: string, decimals: number): bigint {
  const trimmed = value.trim();

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Enter a positive numeric amount.');
  }

  const [whole, fraction = ''] = trimmed.split('.');

  if (fraction.length > decimals) {
    throw new Error(`Amount has more than ${decimals} decimal places.`);
  }

  const paddedFraction = fraction.padEnd(decimals, '0');
  const parsed = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFraction || '0');

  if (parsed <= 0n) {
    throw new Error('Amount must be greater than zero.');
  }

  return parsed;
}
