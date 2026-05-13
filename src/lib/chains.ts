import type {
  AssetConfig,
  AssetId,
  BuiltinChainId,
  BuiltinEvmChainId,
  ChainConfig,
  ChainId,
  CustomEvmChain,
  CustomEvmChainId,
  CustomEvmChains,
  EvmChainId,
  NetworkMode,
  RpcPreferences,
} from './types';

const MAX_CUSTOM_RPC_URLS_PER_CHAIN = 5;
const MAX_CUSTOM_EVM_CHAINS_PER_NETWORK = 25;
const NETWORK_MODES: NetworkMode[] = ['mainnet', 'testnet'];
const WELL_KNOWN_MAINNET_EVM_CHAIN_IDS = new Set([
  1, 10, 56, 100, 137, 8453, 9745, 42161, 43114, 59144, 534352,
]);
const WELL_KNOWN_TESTNET_EVM_CHAIN_IDS = new Set([
  97, 31337, 84532, 9746, 421614, 43113, 80002, 59141, 534351, 11155111, 11155420,
]);
export const EVM_CHAIN_ORDER: BuiltinEvmChainId[] = ['ethereum', 'polygon', 'arbitrum', 'plasma'];

export type AddEthereumChainParameter = {
  chainId?: string;
  chainName?: string;
  nativeCurrency?: {
    name?: string;
    symbol?: string;
    decimals?: number;
  };
  rpcUrls?: string[];
  blockExplorerUrls?: string[];
};

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

export const CHAIN_ORDER: BuiltinChainId[] = [
  'bitcoin',
  'spark',
  'ethereum',
  'polygon',
  'arbitrum',
  'plasma',
  'solana',
];

export const CHAINS: Record<NetworkMode, Record<BuiltinChainId, ChainConfig>> = {
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

export function isCustomEvmChainId(chainId: string): chainId is CustomEvmChainId {
  return /^eip155:[1-9]\d*$/.test(chainId);
}

export function customEvmChainId(chainId: number): CustomEvmChainId {
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error('EVM chain id must be a positive safe integer.');
  }
  return `eip155:${chainId}`;
}

function isBuiltinChainId(chainId: ChainId): chainId is BuiltinChainId {
  return Object.prototype.hasOwnProperty.call(CHAINS.mainnet, chainId);
}

function customChainToConfig(chain: CustomEvmChain): ChainConfig {
  return {
    id: chain.id,
    label: chain.label,
    networkLabel: chain.networkLabel,
    networkMode: chain.networkMode,
    family: 'evm',
    chainId: chain.chainId,
    rpcUrls: chain.rpcUrls,
    explorerTx: chain.explorerTx,
    assets: [
      {
        id: chain.nativeCurrency.symbol,
        label: chain.nativeCurrency.name,
        decimals: chain.nativeCurrency.decimals,
        kind: 'native',
      },
    ],
    canSend: true,
  };
}

export function getCustomEvmChainsForNetwork(
  networkMode: NetworkMode,
  customEvmChains?: CustomEvmChains,
): CustomEvmChain[] {
  return Object.values(customEvmChains?.[networkMode] ?? {})
    .filter((chain): chain is CustomEvmChain => Boolean(chain))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getChain(
  chainId: ChainId,
  networkMode: NetworkMode,
  customEvmChains?: CustomEvmChains,
): ChainConfig {
  if (isBuiltinChainId(chainId)) {
    return CHAINS[networkMode][chainId];
  }

  const customChain = customEvmChains?.[networkMode]?.[chainId];
  if (customChain) return customChainToConfig(customChain);

  throw new Error(`Unsupported chain: ${chainId}.`);
}

export function getChains(
  networkMode: NetworkMode,
  customEvmChains?: CustomEvmChains,
): Record<ChainId, ChainConfig> {
  return Object.fromEntries(
    getChainList(networkMode, customEvmChains).map((chain) => [chain.id, chain]),
  ) as Record<ChainId, ChainConfig>;
}

export function getChainList(
  networkMode: NetworkMode,
  customEvmChains?: CustomEvmChains,
): ChainConfig[] {
  return [
    ...CHAIN_ORDER.map((chainId) => CHAINS[networkMode][chainId]),
    ...getCustomEvmChainsForNetwork(networkMode, customEvmChains).map(customChainToConfig),
  ];
}

export function getEvmChain(
  chainId: EvmChainId,
  networkMode: NetworkMode,
  customEvmChains?: CustomEvmChains,
): ChainConfig & { chainId: number } {
  const chain = getChain(chainId, networkMode, customEvmChains);
  if (chain.family !== 'evm' || typeof chain.chainId !== 'number') {
    throw new Error(`${chain.label} is not an EVM chain.`);
  }

  return chain as ChainConfig & { chainId: number };
}

export function toHexChainId(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

function parseHexChainId(hexChainId: string): number | null {
  if (!/^0x[0-9a-f]+$/i.test(hexChainId)) return null;
  const parsed = Number.parseInt(hexChainId, 16);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function findBuiltinEvmChainByNumericId(
  chainId: number,
): { chainId: BuiltinEvmChainId; networkMode: NetworkMode; chain: ChainConfig & { chainId: number } } | null {
  for (const networkMode of NETWORK_MODES) {
    for (const builtinChainId of EVM_CHAIN_ORDER) {
      const chain = getEvmChain(builtinChainId, networkMode);
      if (chain.chainId === chainId) {
        return { chainId: builtinChainId, networkMode, chain };
      }
    }
  }

  return null;
}

export function findEvmChainByHexId(
  hexChainId: string,
  customEvmChains?: CustomEvmChains,
): { chainId: EvmChainId; networkMode: NetworkMode; chain: ChainConfig & { chainId: number } } | null {
  const parsed = parseHexChainId(hexChainId);
  if (!parsed) return null;

  const builtin = findBuiltinEvmChainByNumericId(parsed);
  if (builtin) return builtin;

  for (const networkMode of NETWORK_MODES) {
    for (const customChain of getCustomEvmChainsForNetwork(networkMode, customEvmChains)) {
      if (customChain.chainId === parsed) {
        return {
          chainId: customChain.id,
          networkMode,
          chain: customChainToConfig(customChain) as ChainConfig & { chainId: number },
        };
      }
    }
  }

  return null;
}

function normalizeLabel(value: unknown, fallback: string, maxLength = 64): string {
  const label = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!label) return fallback;
  return label.slice(0, maxLength);
}

function normalizeHttpsUrl(url: string): URL {
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 512) {
    throw new Error('Enter a valid HTTPS URL.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Enter a valid HTTPS URL.');
  }

  if (parsed.protocol !== 'https:' || !parsed.hostname) {
    throw new Error('URLs must use HTTPS.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URLs cannot include embedded credentials.');
  }

  parsed.hash = '';
  return parsed;
}

function normalizeExplorerTxUrl(url: string): string {
  const parsed = normalizeHttpsUrl(url);
  parsed.search = '';

  const base = parsed.toString().replace(/\/$/, '');
  if (/\/tx$/i.test(parsed.pathname.replace(/\/$/, ''))) {
    return `${base}/`;
  }
  return `${base}/tx/`;
}

function normalizeNativeCurrency(
  currency: AddEthereumChainParameter['nativeCurrency'] | undefined,
): CustomEvmChain['nativeCurrency'] {
  const decimals = Number(currency?.decimals ?? 18);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error('Native currency decimals must be an integer between 0 and 36.');
  }

  const symbol = normalizeLabel(currency?.symbol, 'ETH', 12).toUpperCase();
  if (!/^[A-Z0-9._-]{1,12}$/.test(symbol)) {
    throw new Error('Native currency symbol must be 1-12 ASCII letters, numbers, dots, underscores, or dashes.');
  }

  return {
    name: normalizeLabel(currency?.name, symbol, 48),
    symbol,
    decimals,
  };
}

export function inferCustomEvmNetworkMode(chainId: number, fallback: NetworkMode): NetworkMode {
  if (WELL_KNOWN_MAINNET_EVM_CHAIN_IDS.has(chainId)) return 'mainnet';
  if (WELL_KNOWN_TESTNET_EVM_CHAIN_IDS.has(chainId)) return 'testnet';
  return fallback;
}

export function normalizeAddEthereumChainParameter(
  value: unknown,
  networkMode: NetworkMode,
  now = Date.now(),
): CustomEvmChain {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('wallet_addEthereumChain requires a chain object.');
  }

  const input = value as AddEthereumChainParameter;
  if (!input.chainId) {
    throw new Error('wallet_addEthereumChain requires a chainId.');
  }

  const numericChainId = parseHexChainId(input.chainId);
  if (!numericChainId) {
    throw new Error('EVM chainId must be a positive hexadecimal quantity.');
  }

  if (findBuiltinEvmChainByNumericId(numericChainId)) {
    throw new Error(`${input.chainId} is already supported as a built-in chain.`);
  }

  const rpcUrls = [
    ...new Set((input.rpcUrls ?? []).map((url) => normalizeRpcUrl(String(url)))),
  ].slice(0, MAX_CUSTOM_RPC_URLS_PER_CHAIN);

  if (rpcUrls.length === 0) {
    throw new Error('wallet_addEthereumChain requires at least one HTTPS RPC URL.');
  }

  const id = customEvmChainId(numericChainId);
  const label = normalizeLabel(input.chainName, `EVM ${numericChainId}`);
  const inferredNetworkMode = inferCustomEvmNetworkMode(numericChainId, networkMode);
  const explorerTx = input.blockExplorerUrls?.[0]
    ? normalizeExplorerTxUrl(String(input.blockExplorerUrls[0]))
    : undefined;

  return {
    id,
    chainId: numericChainId,
    label,
    networkLabel: `${label} ${inferredNetworkMode === 'mainnet' ? 'Mainnet' : 'Testnet'}`,
    networkMode: inferredNetworkMode,
    rpcUrls,
    explorerTx,
    nativeCurrency: normalizeNativeCurrency(input.nativeCurrency),
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeCustomEvmChains(customEvmChains: CustomEvmChains | undefined): CustomEvmChains {
  const normalized: CustomEvmChains = {};

  for (const networkMode of NETWORK_MODES) {
    const entries: Array<[CustomEvmChainId, CustomEvmChain]> = [];

    for (const candidate of Object.values(customEvmChains?.[networkMode] ?? {})) {
      try {
        if (!candidate || typeof candidate !== 'object') continue;
        const chainId = Number(candidate.chainId);
        if (!Number.isSafeInteger(chainId) || chainId <= 0) continue;
        if (findBuiltinEvmChainByNumericId(chainId)) continue;

        const id = isCustomEvmChainId(candidate.id) && candidate.id === customEvmChainId(chainId)
          ? candidate.id
          : customEvmChainId(chainId);
        const rpcUrls = [
          ...new Set((candidate.rpcUrls ?? []).map((url) => normalizeRpcUrl(String(url)))),
        ].slice(0, MAX_CUSTOM_RPC_URLS_PER_CHAIN);
        if (!rpcUrls.length) continue;

        const label = normalizeLabel(candidate.label, `EVM ${chainId}`);
        entries.push([
          id,
          {
            id,
            chainId,
            label,
            networkLabel: normalizeLabel(
              candidate.networkLabel,
              `${label} ${networkMode === 'mainnet' ? 'Mainnet' : 'Testnet'}`,
            ),
            networkMode,
            rpcUrls,
            explorerTx: candidate.explorerTx ? normalizeExplorerTxUrl(candidate.explorerTx) : undefined,
            nativeCurrency: normalizeNativeCurrency(candidate.nativeCurrency),
            createdAt: Number.isFinite(candidate.createdAt) ? candidate.createdAt : Date.now(),
            updatedAt: Number.isFinite(candidate.updatedAt) ? candidate.updatedAt : Date.now(),
          },
        ]);
      } catch {
        // Ignore malformed legacy records.
      }
    }

    if (entries.length > 0) {
      normalized[networkMode] = Object.fromEntries(
        entries.slice(0, MAX_CUSTOM_EVM_CHAINS_PER_NETWORK),
      ) as Partial<Record<CustomEvmChainId, CustomEvmChain>>;
    }
  }

  return normalized;
}

export function addCustomEvmChain(
  customEvmChains: CustomEvmChains | undefined,
  chain: CustomEvmChain,
): CustomEvmChains {
  const normalized = normalizeCustomEvmChains(customEvmChains);
  const currentChains = normalized[chain.networkMode] ?? {};

  if (!currentChains[chain.id] && Object.keys(currentChains).length >= MAX_CUSTOM_EVM_CHAINS_PER_NETWORK) {
    throw new Error(`Keep at most ${MAX_CUSTOM_EVM_CHAINS_PER_NETWORK} custom EVM chains per network mode.`);
  }

  return normalizeCustomEvmChains({
    ...normalized,
    [chain.networkMode]: {
      ...currentChains,
      [chain.id]: {
        ...chain,
        updatedAt: Date.now(),
      },
    },
  });
}

export function removeCustomEvmChain(
  customEvmChains: CustomEvmChains | undefined,
  chainId: CustomEvmChainId,
  networkMode: NetworkMode,
): CustomEvmChains {
  const normalized = normalizeCustomEvmChains(customEvmChains);
  const { [chainId]: _removed, ...remaining } = normalized[networkMode] ?? {};
  return Object.keys(remaining).length
    ? { ...normalized, [networkMode]: remaining }
    : Object.fromEntries(
        Object.entries(normalized).filter(([mode]) => mode !== networkMode),
      ) as CustomEvmChains;
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

export function getBuiltinRpcUrls(
  chainId: ChainId,
  networkMode: NetworkMode,
  customEvmChains?: CustomEvmChains,
): string[] {
  return getChain(chainId, networkMode, customEvmChains).rpcUrls ?? [];
}

export function normalizeRpcPreferences(
  preferences: RpcPreferences | undefined,
  customEvmChains?: CustomEvmChains,
): RpcPreferences {
  const normalized: RpcPreferences = {};

  for (const networkMode of NETWORK_MODES) {
    for (const chain of getChainList(networkMode, customEvmChains)) {
      if (!supportsCustomRpc(chain)) continue;

      const urls = preferences?.[networkMode]?.[chain.id] ?? [];
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
          [chain.id]: cleanUrls,
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
  customEvmChains?: CustomEvmChains,
): string[] {
  return normalizeRpcPreferences(preferences, customEvmChains)[networkMode]?.[chainId] ?? [];
}

function getStoredRpcUrls(
  preferences: RpcPreferences | undefined,
  chainId: ChainId,
  networkMode: NetworkMode,
): string[] {
  return [...new Set((preferences?.[networkMode]?.[chainId] ?? []).map((url) => {
    try {
      return normalizeRpcUrl(url);
    } catch {
      return '';
    }
  }).filter(Boolean))].slice(0, MAX_CUSTOM_RPC_URLS_PER_CHAIN);
}

export function getEffectiveRpcUrls(
  chainId: ChainId,
  networkMode: NetworkMode,
  preferences?: RpcPreferences,
  customEvmChains?: CustomEvmChains,
): string[] {
  return [
    ...new Set([
      ...getCustomRpcUrls(preferences, chainId, networkMode, customEvmChains),
      ...getBuiltinRpcUrls(chainId, networkMode, customEvmChains),
    ]),
  ];
}

export function addRpcPreference(
  preferences: RpcPreferences | undefined,
  chainId: ChainId,
  networkMode: NetworkMode,
  url: string,
  customEvmChains?: CustomEvmChains,
): RpcPreferences {
  const chain = getChain(chainId, networkMode, customEvmChains);
  if (!supportsCustomRpc(chain)) {
    throw new Error(`${chain.label} does not expose a configurable RPC endpoint.`);
  }

  const normalizedUrl = normalizeRpcUrl(url);
  const current = getCustomRpcUrls(preferences, chainId, networkMode, customEvmChains);

  if (current.includes(normalizedUrl)) {
    return normalizeRpcPreferences(preferences, customEvmChains);
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
  }, customEvmChains);
}

export function removeRpcPreference(
  preferences: RpcPreferences | undefined,
  chainId: ChainId,
  networkMode: NetworkMode,
  url: string,
  customEvmChains?: CustomEvmChains,
): RpcPreferences {
  const normalizedUrl = normalizeRpcUrl(url);
  const current = getCustomRpcUrls(preferences, chainId, networkMode, customEvmChains);

  return normalizeRpcPreferences({
    ...preferences,
    [networkMode]: {
      ...preferences?.[networkMode],
      [chainId]: current.filter((candidate) => candidate !== normalizedUrl),
    },
  }, customEvmChains);
}

export function withRpcPreferences(
  chain: ChainConfig,
  preferences?: RpcPreferences,
): ChainConfig {
  const rpcUrls = [
    ...new Set([
      ...getStoredRpcUrls(preferences, chain.id, chain.networkMode),
      ...(chain.rpcUrls ?? []),
    ]),
  ];
  return rpcUrls.length ? { ...chain, rpcUrls } : chain;
}

export function getAsset(
  chainId: ChainId,
  assetId: AssetId,
  networkMode: NetworkMode,
  customEvmChains?: CustomEvmChains,
): AssetConfig {
  const chain = getChain(chainId, networkMode, customEvmChains);
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
