import type { AssetConfig, AssetId, ChainConfig, ChainId } from './types';

const btcAsset: AssetConfig = {
  id: 'BTC',
  label: 'Bitcoin',
  decimals: 8,
  kind: 'native',
};

export const CHAINS: Record<ChainId, ChainConfig> = {
  bitcoin: {
    id: 'bitcoin',
    label: 'Bitcoin',
    family: 'bitcoin',
    explorerTx: 'https://mempool.space/tx/',
    assets: [btcAsset, { id: 'USDT', label: 'USDt', decimals: 8, kind: 'token' }],
    canSend: true,
  },
  spark: {
    id: 'spark',
    label: 'Lightning (Spark)',
    family: 'spark',
    assets: [btcAsset],
    canSend: true,
  },
  ethereum: {
    id: 'ethereum',
    label: 'Ethereum',
    family: 'evm',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorerTx: 'https://etherscan.io/tx/',
    assets: [
      { id: 'ETH', label: 'Ether', decimals: 18, kind: 'native' },
      {
        id: 'USDT',
        label: 'USDt',
        decimals: 6,
        kind: 'token',
        tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      },
      {
        id: 'XAUT',
        label: 'XAUt',
        decimals: 6,
        kind: 'token',
        tokenAddress: '0x68749665FF8D2d112Fa859AA293F07A622782F38',
      },
    ],
    canSend: true,
  },
  polygon: {
    id: 'polygon',
    label: 'Polygon',
    family: 'evm',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    explorerTx: 'https://polygonscan.com/tx/',
    assets: [
      { id: 'POL', label: 'POL', decimals: 18, kind: 'native' },
      {
        id: 'USDT',
        label: 'USDt',
        decimals: 6,
        kind: 'token',
        tokenAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      },
    ],
    canSend: true,
  },
  arbitrum: {
    id: 'arbitrum',
    label: 'Arbitrum',
    family: 'evm',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerTx: 'https://arbiscan.io/tx/',
    assets: [
      { id: 'ARB', label: 'ETH on Arbitrum', decimals: 18, kind: 'native' },
      {
        id: 'USDT',
        label: 'USDt',
        decimals: 6,
        kind: 'token',
        tokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      },
    ],
    canSend: true,
  },
  plasma: {
    id: 'plasma',
    label: 'Plasma',
    family: 'evm',
    assets: [{ id: 'USDT', label: 'USDt', decimals: 6, kind: 'native' }],
    canSend: false,
  },
  solana: {
    id: 'solana',
    label: 'Solana',
    family: 'solana',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerTx: 'https://solscan.io/tx/',
    assets: [
      { id: 'SOL', label: 'Solana', decimals: 9, kind: 'native' },
      {
        id: 'USDT',
        label: 'USDt',
        decimals: 6,
        kind: 'token',
        tokenAddress: 'Es9vMFrzaCERmJfrF4H2FYD4kConky11McCe8BenwNYB',
      },
    ],
    canSend: true,
  },
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

export function getAsset(chainId: ChainId, assetId: AssetId): AssetConfig {
  const asset = CHAINS[chainId].assets.find((candidate) => candidate.id === assetId);

  if (!asset) {
    throw new Error(`${assetId} is not supported on ${CHAINS[chainId].label}.`);
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
