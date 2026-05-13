export type NetworkMode = 'mainnet' | 'testnet';

export type BuiltinChainId =
  | 'bitcoin'
  | 'spark'
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'plasma'
  | 'solana';

export type BuiltinEvmChainId = 'ethereum' | 'polygon' | 'arbitrum' | 'plasma';

export type CustomEvmChainId = `eip155:${number}`;

export type ChainId = BuiltinChainId | CustomEvmChainId;

export type EvmChainId = BuiltinEvmChainId | CustomEvmChainId;

export type AssetId = string;

export type RpcPreferences = Partial<Record<NetworkMode, Partial<Record<ChainId, string[]>>>>;

export type CustomEvmChain = {
  id: CustomEvmChainId;
  chainId: number;
  label: string;
  networkLabel: string;
  networkMode: NetworkMode;
  rpcUrls: string[];
  explorerTx?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  createdAt: number;
  updatedAt: number;
};

export type CustomEvmChains = Partial<Record<NetworkMode, Partial<Record<CustomEvmChainId, CustomEvmChain>>>>;

export type DappPermission = {
  origin: string;
  walletId: string;
  accountIndex: number;
  chainId: EvmChainId;
  networkMode: NetworkMode;
  approvedAt: number;
  updatedAt: number;
};

type SendStatus = 'draft' | 'quoted' | 'submitted' | 'confirmed' | 'failed';

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
  networkMode: NetworkMode;
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
  networkMode: NetworkMode;
  customEvmChains: CustomEvmChains;
  rpcPreferences: RpcPreferences;
  dappPermissions: Record<string, DappPermission>;
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
  networkLabel: string;
  networkMode: NetworkMode;
  family: 'bitcoin' | 'spark' | 'evm' | 'solana';
  explorerTx?: string;
  rpcUrls?: string[];
  bitcoinNetwork?: 'bitcoin' | 'testnet' | 'regtest';
  sparkNetwork?: 'MAINNET' | 'REGTEST';
  chainId?: number;
  assets: AssetConfig[];
  canSend: boolean;
  statusNote?: string;
};

export type AccountSnapshot = {
  walletId: string;
  walletName: string;
  accountIndex: number;
  chainId: ChainId;
  chainLabel: string;
  networkMode: NetworkMode;
  networkLabel: string;
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
  networkMode: NetworkMode;
  customEvmChains: CustomEvmChains;
  rpcPreferences: RpcPreferences;
  dappPermissions: Record<string, DappPermission>;
  sessionExpiresAt: number | null;
  wallets: Array<Omit<VaultWallet, 'seedPhrase'>>;
  accounts: AccountSnapshot[];
  transactions: TransactionRecord[];
  primitives: WdkPrimitiveDefinition[];
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

type WdkPrimitiveCategory =
  | 'core'
  | 'wallet'
  | 'evm'
  | 'bitcoin'
  | 'spark';

export type WdkPrimitiveId =
  | 'core:generateSeedPhrase'
  | 'core:validateSeedPhrase'
  | 'core:getAccount'
  | 'core:getAccountByPath'
  | 'core:getFeeRates'
  | 'wallet:getAddress'
  | 'wallet:getBalance'
  | 'wallet:getTokenBalance'
  | 'wallet:getTokenBalances'
  | 'wallet:quoteSendTransaction'
  | 'wallet:quoteTransfer'
  | 'wallet:getTransactionReceipt'
  | 'wallet:getTransfers'
  | 'wallet:signMessage'
  | 'wallet:verifyMessage'
  | 'wallet:signTransaction'
  | 'wallet:sendTransaction'
  | 'wallet:transfer'
  | 'evm:signTypedData'
  | 'evm:verifyTypedData'
  | 'evm:getAllowance'
  | 'evm:approve'
  | 'evm:getDelegation'
  | 'evm:signAuthorization'
  | 'evm:delegate'
  | 'evm:revokeDelegation'
  | 'bitcoin:getMaxSpendable'
  | 'spark:getIdentityKey'
  | 'spark:getUnusedDepositAddresses'
  | 'spark:getStaticDepositAddresses'
  | 'spark:getUtxosForDepositAddress'
  | 'spark:getSparkInvoices'
  | 'spark:getSingleUseDepositAddress'
  | 'spark:getStaticDepositAddress'
  | 'spark:claimDeposit'
  | 'spark:claimStaticDeposit'
  | 'spark:refundStaticDeposit'
  | 'spark:quoteWithdraw'
  | 'spark:withdraw'
  | 'spark:createLightningInvoice'
  | 'spark:getLightningReceiveRequest'
  | 'spark:getLightningSendRequest'
  | 'spark:payLightningInvoice'
  | 'spark:quotePayLightningInvoice'
  | 'spark:createSparkSatsInvoice'
  | 'spark:createSparkTokensInvoice'
  | 'spark:paySparkInvoice'
  | 'spark:syncWalletBalance';

export type WdkPrimitiveDefinition = {
  id: WdkPrimitiveId;
  label: string;
  category: WdkPrimitiveCategory;
  chains: ChainId[];
  description: string;
  payloadHint?: string;
  mutates?: boolean;
};

export type PrimitiveRequest = {
  walletId: string;
  accountIndex: number;
  chainId: ChainId;
  operationId: WdkPrimitiveId;
  payload: string;
};

export type PrimitiveResult = {
  operationId: WdkPrimitiveId;
  label: string;
  result: string;
};
