import { useEffect, useMemo, useState } from 'react';
import * as QRCode from 'qrcode';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Coins,
  Copy,
  KeyRound,
  Lock,
  Plus,
  QrCode,
  RefreshCcw,
  ScanLine,
  Send,
  Settings,
  Shield,
  Terminal,
  Trash2,
  Wallet,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/src/components/ui/alert';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Separator } from '@/src/components/ui/separator';
import { Switch } from '@/src/components/ui/switch';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/src/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Textarea } from '@/src/components/ui/textarea';
import { TooltipProvider } from '@/src/components/ui/tooltip';
import {
  EVM_CHAIN_ORDER,
  getBuiltinRpcUrls,
  getChain,
  getChainList,
  getCustomRpcUrls,
  isCustomEvmChainId,
  normalizeRpcUrl,
  rpcPermissionPattern,
  supportsCustomRpc,
} from '@/src/lib/chains';
import { sendRuntimeMessage } from '@/src/lib/messages';
import type {
  AccountSnapshot,
  ChainId,
  DashboardState,
  NetworkMode,
  PrimitiveRequest,
  SendRequest,
  WdkPrimitiveId,
} from '@/src/lib/types';
import './App.css';

type Toast = { tone: 'success' | 'error'; message: string } | null;

const emptyDashboard: DashboardState = {
  locked: true,
  hasVault: false,
  activeWalletId: null,
  networkMode: 'mainnet',
  customEvmChains: {},
  rpcPreferences: {},
  dappPermissions: {},
  sessionExpiresAt: null,
  wallets: [],
  accounts: [],
  transactions: [],
  primitives: [],
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(value: number): string {
  return dateFormatter.format(new Date(value));
}

function App() {
  const [dashboard, setDashboard] = useState<DashboardState>(emptyDashboard);
  const [password, setPassword] = useState('');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [walletName, setWalletName] = useState('Primary wallet');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [selectedChain, setSelectedChain] = useState<ChainId>('ethereum');
  const [selectedAccount, setSelectedAccount] = useState(0);
  const [receiveQr, setReceiveQr] = useState('');
  const [sendForm, setSendForm] = useState({ to: '', amount: '', assetId: 'USDT' });
  const [quote, setQuote] = useState<string | null>(null);
  const [addWalletOpen, setAddWalletOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rpcUrl, setRpcUrl] = useState('');
  const [newWalletName, setNewWalletName] = useState('Imported wallet');
  const [newWalletSeed, setNewWalletSeed] = useState('');
  const [primitiveId, setPrimitiveId] = useState<WdkPrimitiveId>('wallet:getAddress');
  const [primitivePayload, setPrimitivePayload] = useState('');
  const [primitiveResult, setPrimitiveResult] = useState('');
  const [txFilter, setTxFilter] = useState('all');
  const [createStep, setCreateStep] = useState<'seed' | 'password'>('seed');
  const [seedCopied, setSeedCopied] = useState(false);
  const [seedMode, setSeedMode] = useState<'choose' | 'create' | 'recover'>('choose');

  const activeWallet = dashboard.wallets.find((wallet) => wallet.id === dashboard.activeWalletId);
  const chainOptions = useMemo(
    () => getChainList(dashboard.networkMode, dashboard.customEvmChains),
    [dashboard.customEvmChains, dashboard.networkMode],
  );
  const activeChainId = chainOptions.some((option) => option.id === selectedChain)
    ? selectedChain
    : 'ethereum';
  const chain = getChain(activeChainId, dashboard.networkMode, dashboard.customEvmChains);
  const isCustomChain = isCustomEvmChainId(activeChainId);
  const selectedAsset = chain.assets.find((asset) => asset.id === sendForm.assetId) ?? chain.assets[0];
  const customRpcSupported = supportsCustomRpc(chain);
  const builtinRpcUrls = getBuiltinRpcUrls(activeChainId, dashboard.networkMode, dashboard.customEvmChains);
  const customRpcUrls = getCustomRpcUrls(
    dashboard.rpcPreferences,
    activeChainId,
    dashboard.networkMode,
    dashboard.customEvmChains,
  );

  const selectedSnapshot = useMemo<AccountSnapshot | undefined>(
    () =>
      dashboard.accounts.find(
        (account) => account.chainId === activeChainId && account.accountIndex === selectedAccount,
      ),
    [activeChainId, dashboard.accounts, selectedAccount],
  );

  const visiblePrimitives = useMemo(
    () => dashboard.primitives.filter((primitive) =>
      primitive.chains.includes(activeChainId) ||
      (chain.family === 'evm' && primitive.chains.some((primitiveChainId) =>
        EVM_CHAIN_ORDER.includes(primitiveChainId as never),
      )),
    ),
    [activeChainId, chain.family, dashboard.primitives],
  );

  const selectedPrimitive = visiblePrimitives.find((primitive) => primitive.id === primitiveId);
  const filteredTransactions = dashboard.transactions.filter((tx) =>
    txFilter === 'all' ? true : tx.status === txFilter,
  );
  const accountOptions = useMemo(
    () =>
      Array.from({ length: activeWallet?.accountCount ?? 1 }, (_, accountIndex) => ({
        label: `Account ${accountIndex + 1}`,
        value: String(accountIndex),
      })),
    [activeWallet?.accountCount],
  );

  async function run<T>(task: () => Promise<T>, success?: string): Promise<T | undefined> {
    setToast(null);
    setBusy(true);
    try {
      const result = await task();
      if (success) setToast({ tone: 'success', message: success });
      return result;
    } catch (error) {
      setToast({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unexpected error.',
      });
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const response = await sendRuntimeMessage({
      type: 'vault:get',
      chainId: activeChainId,
      accountIndex: selectedAccount,
    });
    if (!response.ok) throw new Error(response.error);
    setDashboard(response.data);
  }

  useEffect(() => {
    run(refresh).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || dashboard.locked || !activeWallet || selectedSnapshot) return;
    run(refresh);
  }, [activeChainId, activeWallet, dashboard.locked, loading, selectedAccount, selectedSnapshot]);

  useEffect(() => {
    if (!selectedSnapshot?.address) {
      setReceiveQr('');
      return;
    }

    QRCode.toDataURL(selectedSnapshot.address, { margin: 1, width: 180 })
      .then(setReceiveQr)
      .catch(() => setReceiveQr(''));
  }, [selectedSnapshot?.address]);

  useEffect(() => {
    if (activeChainId !== selectedChain) {
      setSelectedChain(activeChainId);
      return;
    }

    const nextAsset = getChain(activeChainId, dashboard.networkMode, dashboard.customEvmChains).assets[0];
    setSendForm((current) => ({ ...current, assetId: nextAsset.id }));
    setQuote(null);
  }, [activeChainId, dashboard.customEvmChains, dashboard.networkMode, selectedChain]);

  useEffect(() => {
    if (activeWallet && selectedAccount >= activeWallet.accountCount) {
      setSelectedAccount(0);
    }
  }, [activeWallet, selectedAccount]);

  useEffect(() => {
    if (!visiblePrimitives.some((primitive) => primitive.id === primitiveId)) {
      setPrimitiveId(visiblePrimitives[0]?.id ?? 'wallet:getAddress');
      setPrimitivePayload(visiblePrimitives[0]?.payloadHint ?? '');
    }
  }, [primitiveId, visiblePrimitives]);

  async function createVault() {
    await run(async () => {
      const response = await sendRuntimeMessage({
        type: 'vault:create',
        password,
        seedPhrase,
        name: walletName,
      });
      if (!response.ok) throw new Error(response.error);
      setDashboard(response.data);
      setSeedPhrase('');
      setPassword('');
    }, 'Vault created');
  }

  async function unlockVault() {
    await run(async () => {
      const response = await sendRuntimeMessage({ type: 'vault:unlock', password });
      if (!response.ok) throw new Error(response.error);
      setDashboard(response.data);
      setPassword('');
    }, 'Wallet unlocked');
  }

  async function generateSeed(setter: (value: string) => void) {
    await run(async () => {
      const response = await sendRuntimeMessage({ type: 'wallet:generateSeed' });
      if (!response.ok) throw new Error(response.error);
      setter(response.data);
    });
  }

  async function addWallet() {
    await run(async () => {
      const response = await sendRuntimeMessage({
        type: 'wallet:add',
        seedPhrase: newWalletSeed,
        name: newWalletName,
      });
      if (!response.ok) throw new Error(response.error);
      setDashboard(response.data);
      setSelectedAccount(0);
      setNewWalletSeed('');
      setNewWalletName('Imported wallet');
      setAddWalletOpen(false);
    }, 'Wallet added');
  }

  async function switchWallet(walletId: string) {
    await run(async () => {
      const response = await sendRuntimeMessage({ type: 'wallet:setActive', walletId });
      if (!response.ok) throw new Error(response.error);
      setDashboard(response.data);
      setSelectedAccount(0);
      setQuote(null);
      setPrimitiveResult('');
    });
  }

  async function switchNetwork(networkMode: NetworkMode) {
    await run(async () => {
      const response = await sendRuntimeMessage({ type: 'network:set', networkMode });
      if (!response.ok) throw new Error(response.error);
      setDashboard(response.data);
      setQuote(null);
      setPrimitiveResult('');
    }, `${networkMode === 'mainnet' ? 'Mainnet' : 'Testnet'} selected`);
  }

  async function requestRpcHostPermission(url: string) {
    const originPattern = rpcPermissionPattern(url);
    const granted = await browser.permissions.request({ origins: [originPattern] });

    if (!granted) {
      const hasPermission = await browser.permissions.contains({ origins: [originPattern] });
      if (!hasPermission) throw new Error(`Host permission was not granted for ${new URL(url).origin}.`);
    }
  }

  async function addRpcUrl() {
    await run(async () => {
      const url = normalizeRpcUrl(rpcUrl);
      await requestRpcHostPermission(url);
      const response = await sendRuntimeMessage({
        type: 'rpc:add',
        chainId: activeChainId,
        networkMode: dashboard.networkMode,
        url,
      });
      if (!response.ok) throw new Error(response.error);
      setDashboard(response.data);
      setRpcUrl('');
      setQuote(null);
      setPrimitiveResult('');
    }, 'RPC added');
  }

  async function removeRpcUrl(url: string) {
    await run(async () => {
      const response = await sendRuntimeMessage({
        type: 'rpc:remove',
        chainId: activeChainId,
        networkMode: dashboard.networkMode,
        url,
      });
      if (!response.ok) throw new Error(response.error);
      setDashboard(response.data);
      setQuote(null);
      setPrimitiveResult('');
    }, 'RPC removed');
  }

  async function removeCustomChain() {
    if (!isCustomEvmChainId(activeChainId)) return;

    await run(async () => {
      const response = await sendRuntimeMessage({
        type: 'chain:removeCustom',
        chainId: activeChainId,
        networkMode: dashboard.networkMode,
      });
      if (!response.ok) throw new Error(response.error);
      setDashboard(response.data);
      setSelectedChain('ethereum');
      setQuote(null);
      setPrimitiveResult('');
    }, 'Network removed');
  }

  async function addAccount() {
    if (!activeWallet) return;
    await run(async () => {
      const response = await sendRuntimeMessage({
        type: 'wallet:addAccount',
        walletId: activeWallet.id,
      });
      if (!response.ok) throw new Error(response.error);
      setDashboard(response.data);
      setSelectedAccount(activeWallet.accountCount);
    }, 'Account added');
  }

  async function quoteSend() {
    if (!activeWallet) return;
    const request: SendRequest = {
      walletId: activeWallet.id,
      accountIndex: selectedAccount,
      chainId: activeChainId,
      assetId: selectedAsset.id,
      to: sendForm.to,
      amount: sendForm.amount,
    };

    await run(async () => {
      const response = await sendRuntimeMessage({ type: 'send:quote', request });
      if (!response.ok) throw new Error(response.error);
      setQuote(
        response.data.warning ??
          `Estimated fee: ${response.data.formattedFee} ${selectedAsset.label}`,
      );
    });
  }

  async function broadcastSend() {
    if (!activeWallet) return;
    const request: SendRequest = {
      walletId: activeWallet.id,
      accountIndex: selectedAccount,
      chainId: activeChainId,
      assetId: selectedAsset.id,
      to: sendForm.to,
      amount: sendForm.amount,
    };

    await run(async () => {
      const response = await sendRuntimeMessage({ type: 'send:broadcast', request });
      if (!response.ok) throw new Error(response.error);
      setDashboard(response.data);
      setSendForm((current) => ({ ...current, to: '', amount: '' }));
      setQuote(null);
    }, 'Transaction submitted');
  }

  async function executePrimitive() {
    if (!activeWallet) return;
    if (
      selectedPrimitive?.mutates &&
      !window.confirm('This WDK primitive can mutate wallet or network state. Continue?')
    ) {
      return;
    }

    const request: PrimitiveRequest = {
      walletId: activeWallet.id,
      accountIndex: selectedAccount,
      chainId: activeChainId,
      operationId: primitiveId,
      payload: primitivePayload,
    };

    await run(async () => {
      const response = await sendRuntimeMessage({ type: 'primitive:execute', request });
      if (!response.ok) throw new Error(response.error);
      setPrimitiveResult(response.data.result);
    }, 'WDK primitive executed');
  }

  async function copyAddress() {
    if (!selectedSnapshot?.address) return;
    await navigator.clipboard.writeText(selectedSnapshot.address);
    setToast({ tone: 'success', message: 'Address copied' });
  }

  async function copySeed() {
    if (!seedPhrase) return;
    await navigator.clipboard.writeText(seedPhrase);
    setSeedCopied(true);
    setToast({ tone: 'success', message: 'Seed phrase copied' });
  }

  async function readRecipientQr(file: File | null) {
    if (!file) return;

    await run(async () => {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader();
      const url = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(url);
        setSendForm((current) => ({ ...current, to: result.getText() }));
      } finally {
        URL.revokeObjectURL(url);
      }
    }, 'QR address loaded');
  }

  if (loading) {
    return <main className="popup-shell status-only">Loading wallet…</main>;
  }

  if (dashboard.locked) {
    return (
      <TooltipProvider>
        <main className="popup-shell wallet-scroll p-6">
          <section className="mb-6 flex items-center gap-4">
            <div className="brand-orb">
              <Wallet />
            </div>
            <div>
              <h1 className="text-lg font-semibold">WDK Wallet</h1>
            </div>
          </section>

          {dashboard.hasVault ? (
            <section className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold">Unlock your vault</h2>
              </div>
              <div>
                <Input
                  id="vault-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-label="Password"
                  placeholder="Your password"
                />
              </div>
              <Button className="w-full" onClick={unlockVault} disabled={busy}>
                <Lock data-icon="inline-start" />
                Unlock
              </Button>
            </section>
          ) : createStep === 'seed' ? (
            <section className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold">
                  {seedMode === 'recover' ? 'Step 1: Recover wallet' : 'Step 1: Create your wallet'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {seedMode === 'recover'
                    ? 'Paste your existing BIP-39 seed phrase to restore your wallet.'
                    : seedMode === 'create'
                      ? 'Save your seed phrase somewhere safe. You will need it to recover your wallet.'
                      : 'Create a new wallet or recover an existing one from a seed phrase.'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="wallet-name">Wallet name</Label>
                <Input
                  id="wallet-name"
                  value={walletName}
                  onChange={(event) => setWalletName(event.target.value)}
                />
              </div>

              {seedMode === 'choose' ? (
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    onClick={async () => {
                      setSeedCopied(false);
                      await generateSeed(setSeedPhrase);
                      setSeedMode('create');
                    }}
                    disabled={busy}
                  >
                    <KeyRound data-icon="inline-start" />
                    Create wallet
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSeedPhrase('');
                      setSeedCopied(false);
                      setSeedMode('recover');
                    }}
                    disabled={busy}
                  >
                    Recover wallet
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="seed-phrase">Seed phrase</Label>
                    <Textarea
                      id="seed-phrase"
                      value={seedPhrase}
                      readOnly={seedMode === 'create'}
                      onChange={(event) => {
                        setSeedPhrase(event.target.value);
                        setSeedCopied(false);
                      }}
                      rows={4}
                      placeholder={
                        seedMode === 'recover' ? 'Paste your BIP-39 seed phrase' : ''
                      }
                    />
                  </div>

                  {seedMode === 'create' && (
                    <>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={copySeed}
                        disabled={!seedPhrase || busy}
                      >
                        <Copy data-icon="inline-start" />
                        {seedCopied ? 'Copied' : 'Copy seed phrase'}
                      </Button>
                      <Alert variant="destructive">
                        <AlertTriangle />
                        <AlertTitle>Save your seed phrase now</AlertTitle>
                        <AlertDescription>
                          If you don't copy it now, you will not be able to recover your wallet.
                        </AlertDescription>
                      </Alert>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSeedMode('choose');
                        setSeedPhrase('');
                        setSeedCopied(false);
                      }}
                      disabled={busy}
                    >
                      <ArrowLeft data-icon="inline-start" />
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setCreateStep('password')}
                      disabled={!seedPhrase || busy}
                    >
                      Continue
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                  </div>
                </>
              )}
            </section>
          ) : (
            <section className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold">Step 2: Set a password</h2>
                <p className="text-sm text-muted-foreground">
                  Encrypts your seed phrase locally in extension storage.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vault-password">Password</Label>
                <Input
                  id="vault-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 12 characters"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCreateStep('seed')}
                  disabled={busy}
                >
                  <ArrowLeft data-icon="inline-start" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={createVault}
                  disabled={busy || password.length < 12}
                >
                  <Lock data-icon="inline-start" />
                  Create vault
                </Button>
              </div>
            </section>
          )}

          {toast && (
            <p className={`toast ${toast.tone}`} role="alert">
              {toast.message}
            </p>
          )}
        </main>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <main className="popup-shell wallet-scroll">
        <section className="px-6 pt-6 pb-3">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="account-orb">
                <Wallet />
              </div>
              <h1 className="text-base font-semibold">{activeWallet?.name ?? 'WDK Wallet'}</h1>
            </div>
            <div className="flex gap-2">
              <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon-sm" title="Network RPCs">
                    <Settings />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[360px] overflow-y-auto px-6 py-6" side="right">
                  <SheetHeader className="p-0 pr-10">
                    <SheetTitle>Network RPCs</SheetTitle>
                    <SheetDescription>{chain.networkLabel}</SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 flex flex-col gap-5">
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={dashboard.networkMode}
                        onValueChange={(value) => switchNetwork(value as NetworkMode)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Network" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="mainnet">Mainnet</SelectItem>
                            <SelectItem value="testnet">Testnet</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      <Select value={activeChainId} onValueChange={(value) => setSelectedChain(value as ChainId)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chain" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {chainOptions.map((chainOption) => (
                              <SelectItem key={chainOption.id} value={chainOption.id}>
                                {chainOption.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="custom-rpc">Custom RPC</Label>
                      <div className="flex gap-2">
                        <Input
                          id="custom-rpc"
                          value={rpcUrl}
                          onChange={(event) => setRpcUrl(event.target.value)}
                          placeholder="https://rpc.example.com"
                          disabled={!customRpcSupported}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-sm"
                          title="Add RPC"
                          disabled={busy || !customRpcSupported || !rpcUrl.trim()}
                          onClick={addRpcUrl}
                        >
                          <Plus />
                        </Button>
                      </div>
                      {!customRpcSupported && (
                        <p className="text-xs text-muted-foreground">
                          Spark endpoints are managed by the WDK Spark runtime.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label>Custom URLs</Label>
                      {customRpcUrls.length ? (
                        <div className="flex flex-col gap-2">
                          {customRpcUrls.map((url) => (
                            <div key={url} className="flex items-center gap-2 rounded-md border p-2">
                              <span className="min-w-0 flex-1 break-all font-mono text-xs">{url}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                title="Remove RPC"
                                onClick={() => removeRpcUrl(url)}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No custom RPC URLs for this network.</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label>{isCustomChain ? 'Default URLs' : 'Built-in URLs'}</Label>
                      {builtinRpcUrls.length ? (
                        <div className="flex flex-col gap-2">
                          {builtinRpcUrls.map((url) => (
                            <div key={url} className="rounded-md border bg-muted/40 p-2 font-mono text-xs break-all">
                              {url}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No configurable RPC URLs.</p>
                      )}
                    </div>

                    {isCustomChain && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={removeCustomChain}
                        disabled={busy}
                      >
                        <Trash2 data-icon="inline-start" />
                        Remove network
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="outline" size="icon-sm" title="Refresh" onClick={() => run(refresh, 'Balances refreshed')}>
                <RefreshCcw />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                title="Lock"
                onClick={() =>
                  run(async () => {
                    const response = await sendRuntimeMessage({ type: 'vault:lock' });
                    if (!response.ok) throw new Error(response.error);
                    setDashboard(response.data);
                  })
                }
              >
                <Lock />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="network-mode"
                checked={dashboard.networkMode === 'testnet'}
                onCheckedChange={(checked) => switchNetwork(checked ? 'testnet' : 'mainnet')}
              />
              <Label htmlFor="network-mode" className="text-sm font-medium">
                {dashboard.networkMode === 'testnet' ? 'Testnet' : 'Mainnet'}
              </Label>
            </div>

            <Select value={activeChainId} onValueChange={(value) => setSelectedChain(value as ChainId)}>
              <SelectTrigger className="ml-auto w-[160px]">
                <SelectValue placeholder="Chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {chainOptions.map((chainOption) => (
                    <SelectItem key={chainOption.id} value={chainOption.id}>
                      {chainOption.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="flex flex-col gap-4 px-6 pb-4">
          <div className="flex items-center gap-2">
            <Select
              value={dashboard.activeWalletId ?? ''}
              onValueChange={switchWallet}
            >
              <SelectTrigger className="min-w-0 flex-1">
                <SelectValue placeholder="Wallet" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {dashboard.wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={String(selectedAccount)}
              onValueChange={(value) => setSelectedAccount(Number(value))}
            >
              <SelectTrigger className="w-[118px]">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {accountOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={copyAddress}
            disabled={!selectedSnapshot?.address}
            className="group flex items-center gap-2 rounded-md border border-input bg-input/30 px-3 py-2 text-left transition-colors hover:bg-input/50 disabled:cursor-not-allowed disabled:opacity-60"
            title="Copy address"
          >
            <span className="address-text min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {selectedSnapshot?.address ?? 'Address unavailable'}
            </span>
            <Copy className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex-1" onClick={addAccount}>
              <Plus data-icon="inline-start" />
              Add account
            </Button>
            <Sheet open={addWalletOpen} onOpenChange={setAddWalletOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" title="Add wallet">
                  <Plus />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[360px]" side="right">
                <SheetHeader>
                  <SheetTitle>Add wallet</SheetTitle>
                  <SheetDescription>Import a seed phrase into a separate encrypted wallet profile.</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-3 px-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="new-wallet-name">Wallet name</Label>
                    <Input
                      id="new-wallet-name"
                      value={newWalletName}
                      onChange={(event) => setNewWalletName(event.target.value)}
                      placeholder="Wallet name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="new-wallet-seed">Seed phrase</Label>
                    <Textarea
                      id="new-wallet-seed"
                      value={newWalletSeed}
                      onChange={(event) => setNewWalletSeed(event.target.value)}
                      rows={4}
                      placeholder="Generate a seed or paste an existing BIP-39 phrase"
                    />
                  </div>
                  <Button variant="secondary" onClick={() => generateSeed(setNewWalletSeed)} disabled={busy}>
                    Generate
                  </Button>
                </div>
                <SheetFooter>
                  <Button onClick={addWallet} disabled={busy}>Add wallet</Button>
                  <SheetClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
          <Separator />
        </section>

        <Tabs defaultValue="assets" className="gap-4 px-6 pb-6">
          <TabsList className="grid h-auto w-full grid-cols-5 p-1">
            <TabsTrigger value="assets" className="flex-col gap-1 px-1 py-2 text-[11px]">
              <Coins />
              Assets
            </TabsTrigger>
            <TabsTrigger value="send" className="flex-col gap-1 px-1 py-2 text-[11px]">
              <Send />
              Send
            </TabsTrigger>
            <TabsTrigger value="receive" className="flex-col gap-1 px-1 py-2 text-[11px]">
              <QrCode />
              Receive
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-col gap-1 px-1 py-2 text-[11px]">
              <Activity />
              Activity
            </TabsTrigger>
            <TabsTrigger value="wdk" className="flex-col gap-1 px-1 py-2 text-[11px]">
              <Terminal />
              WDK
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="mt-4 flex flex-col gap-4">
            {chain.statusNote && (
              <Alert>
                <Shield />
                <AlertTitle>{chain.networkLabel}</AlertTitle>
                <AlertDescription>{chain.statusNote}</AlertDescription>
              </Alert>
            )}
            {selectedSnapshot?.balances.map((balance) => (
              <div key={balance.assetId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{balance.label}</span>
                  <span>{balance.formatted}</span>
                </div>
                {balance.error && (
                  <p className="text-xs text-muted-foreground">{balance.error}</p>
                )}
                <Separator />
              </div>
            ))}
            {selectedSnapshot?.error && (
              <Alert variant="destructive">
                <AlertTitle>Account unavailable</AlertTitle>
                <AlertDescription>{selectedSnapshot.error}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="send" className="mt-4 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold">Send</h2>
              <p className="text-sm text-muted-foreground">Address validation follows the selected chain and network mode.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Asset</Label>
              <Select
                value={sendForm.assetId}
                onValueChange={(value) => setSendForm((current) => ({ ...current, assetId: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {chain.assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="recipient-address">Recipient address</Label>
              <div className="flex gap-2">
                <Input
                  id="recipient-address"
                  value={sendForm.to}
                  onChange={(event) => setSendForm((current) => ({ ...current, to: event.target.value }))}
                  placeholder="Recipient address"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Scan recipient QR image"
                  onClick={() => document.getElementById('qr-picker')?.click()}
                >
                  <ScanLine />
                </Button>
                <input
                  id="qr-picker"
                  type="file"
                  accept="image/*"
                  aria-label="Scan recipient QR image"
                  className="hidden"
                  onChange={(event) => readRecipientQr(event.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="send-amount">Amount</Label>
              <Input
                id="send-amount"
                value={sendForm.amount}
                onChange={(event) => setSendForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="Amount"
              />
            </div>
            {quote && (
              <Alert>
                <AlertTitle>Quote</AlertTitle>
                <AlertDescription>{quote}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={quoteSend} disabled={busy}>
                Quote
              </Button>
              <Button className="flex-1" onClick={broadcastSend} disabled={busy}>
                <Send data-icon="inline-start" />
                Send
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="receive" className="mt-4 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold">Receive</h2>
              <p className="text-sm text-muted-foreground">{chain.networkLabel}</p>
            </div>
            <div className="flex flex-col items-center gap-4 rounded-lg border bg-input/30 p-5">
              {receiveQr ? (
                <div className="rounded-md bg-white p-3">
                  <img className="qr" src={receiveQr} alt="Receive address QR code" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No address</p>
              )}
              <p className="address-text text-center text-xs text-muted-foreground">
                {selectedSnapshot?.address ?? 'Address unavailable'}
              </p>
            </div>
            <Button className="w-full" variant="secondary" onClick={copyAddress}>
              <Copy data-icon="inline-start" />
              Copy address
            </Button>
          </TabsContent>

          <TabsContent value="activity" className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">Activity</h2>
                <p className="text-sm text-muted-foreground">Refreshed by the background worker.</p>
              </div>
              <Select value={txFilter} onValueChange={setTxFilter}>
                <SelectTrigger size="sm" className="w-[120px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {filteredTransactions.length === 0 ? (
              <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                No transactions yet
              </p>
            ) : (
              <div className="flex flex-col">
                {filteredTransactions.slice(0, 8).map((tx, index, list) => (
                  <article
                    key={tx.id}
                    className={`flex flex-col gap-1.5 py-3 ${index < list.length - 1 ? 'border-b' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm">
                      {tx.assetId} on {getChain(tx.chainId, tx.networkMode, dashboard.customEvmChains).label}
                      </strong>
                      <Badge variant={tx.status === 'failed' ? 'destructive' : 'secondary'}>
                        {tx.status}
                      </Badge>
                    </div>
                    <p className="tx-hash truncate text-xs text-muted-foreground">
                      {tx.error ?? tx.hash ?? tx.to}
                    </p>
                    <p className="text-xs text-muted-foreground/70">{formatDate(tx.createdAt)}</p>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="wdk" className="mt-4 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">WDK primitives</h2>
                <p className="text-sm text-muted-foreground">
                  Advanced console for installed WDK modules: core, wallet, EVM, Bitcoin, and Spark.
                </p>
              </div>
              <Badge variant="outline">{visiblePrimitives.length} ops</Badge>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Operation</Label>
              <Select
                value={primitiveId}
                onValueChange={(value) => {
                  const next = visiblePrimitives.find((primitive) => primitive.id === value);
                  setPrimitiveId(value as WdkPrimitiveId);
                  setPrimitivePayload(next?.payloadHint ?? '');
                  setPrimitiveResult('');
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {visiblePrimitives.map((primitive) => (
                      <SelectItem key={primitive.id} value={primitive.id}>
                        {primitive.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {selectedPrimitive && (
              <Alert>
                <Settings />
                <AlertTitle>{selectedPrimitive.category}</AlertTitle>
                <AlertDescription>{selectedPrimitive.description}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="primitive-payload">JSON payload</Label>
              <Textarea
                id="primitive-payload"
                value={primitivePayload}
                onChange={(event) => setPrimitivePayload(event.target.value)}
                rows={5}
                placeholder="{}"
                className="font-mono text-xs"
              />
            </div>
            <Button className="w-full" onClick={executePrimitive} disabled={busy}>
              <Terminal data-icon="inline-start" />
              Execute primitive
            </Button>
            {primitiveResult && (
              <div className="flex flex-col gap-2">
                <Label>Result</Label>
                <pre className="result-box rounded-lg border bg-input/30 p-3 text-xs">{primitiveResult}</pre>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {toast && (
          <p className={`toast ${toast.tone}`} role="alert">
            {toast.message}
          </p>
        )}
      </main>
    </TooltipProvider>
  );
}

export default App;
