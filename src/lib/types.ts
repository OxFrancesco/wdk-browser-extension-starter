export type ChainId =
  | 'bitcoin'
  | 'spark'
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'plasma'
  | 'solana';

export type AssetId = 'BTC' | 'USDT' | 'XAUT' | 'ETH' | 'POL' | 'ARB' | 'SOL';

export type SendStatus = 'draft' | 'quoted' | 'submitted' | 'confirmed' | 'failed';

export type VaultWallet = {
  id: string;
  name: string;
  seedPhrase: string;
  accountCount: number;
  createdAt: number;
};

export type TransactionRecord = {
  id: string;
  walletId: string;
  accountIndex: number;
  chainId: ChainId;
  assetId: AssetId;
  to: string;
  amount: string;
  fee?: string;
  hash?: string;
  status: SendStatus;
  createdAt: number;
  updatedAt: number;
  error?: string;
};

export type VaultPlaintext = {
  version: 1;
  activeWalletId: string | null;
  sessionTimeoutMinutes: number;
  wallets: VaultWallet[];
  transactions: TransactionRecord[];
};

export type VaultEnvelope = {
  version: 1;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  updatedAt: number;
};

export type AssetConfig = {
  id: AssetId;
  label: string;
  decimals: number;
  kind: 'native' | 'token';
  tokenAddress?: string;
};

export type ChainConfig = {
  id: ChainId;
  label: string;
  family: 'bitcoin' | 'spark' | 'evm' | 'solana';
  explorerTx?: string;
  rpcUrl?: string;
  chainId?: number;
  assets: AssetConfig[];
  canSend: boolean;
};

export type AccountSnapshot = {
  walletId: string;
  walletName: string;
  accountIndex: number;
  chainId: ChainId;
  chainLabel: string;
  address: string;
  balances: Array<{
    assetId: AssetId;
    label: string;
    value: string;
    formatted: string;
    error?: string;
  }>;
  feeRates?: {
    normal: string;
    fast: string;
  };
  error?: string;
};

export type DashboardState = {
  locked: boolean;
  hasVault: boolean;
  activeWalletId: string | null;
  sessionExpiresAt: number | null;
  wallets: Array<Omit<VaultWallet, 'seedPhrase'>>;
  accounts: AccountSnapshot[];
  transactions: TransactionRecord[];
};

export type SendRequest = {
  walletId: string;
  accountIndex: number;
  chainId: ChainId;
  assetId: AssetId;
  to: string;
  amount: string;
};

export type SendQuote = {
  fee: string;
  formattedFee: string;
  canBroadcast: boolean;
  warning?: string;
};
