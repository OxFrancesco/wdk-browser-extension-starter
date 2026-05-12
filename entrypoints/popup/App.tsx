import { useEffect, useMemo, useState } from 'react';
import * as QRCode from 'qrcode';
import {
  Activity,
  Copy,
  KeyRound,
  Lock,
  Plus,
  RefreshCcw,
  Send,
  Settings,
  Shield,
  Wallet,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/src/components/ui/alert';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
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
import { CHAIN_ORDER, getChain, getChains } from '@/src/lib/chains';
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
  sessionExpiresAt: null,
  wallets: [],
  accounts: [],
  transactions: [],
  primitives: [],
};

function shortAddress(address: string): string {
  if (!address) return 'Unavailable';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function formatDate(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
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
  const [newWalletName, setNewWalletName] = useState('Imported wallet');
  const [newWalletSeed, setNewWalletSeed] = useState('');
  const [primitiveId, setPrimitiveId] = useState<WdkPrimitiveId>('wallet:getAddress');
  const [primitivePayload, setPrimitivePayload] = useState('');
  const [primitiveResult, setPrimitiveResult] = useState('');
  const [txFilter, setTxFilter] = useState('all');

  const activeWallet = dashboard.wallets.find((wallet) => wallet.id === dashboard.activeWalletId);
  const chains = getChains(dashboard.networkMode);
  const chain = getChain(selectedChain, dashboard.networkMode);
  const selectedAsset = chain.assets.find((asset) => asset.id === sendForm.assetId) ?? chain.assets[0];

  const selectedSnapshot = useMemo<AccountSnapshot | undefined>(
    () =>
      dashboard.accounts.find(
        (account) => account.chainId === selectedChain && account.accountIndex === selectedAccount,
      ),
    [dashboard.accounts, selectedAccount, selectedChain],
  );

  const visiblePrimitives = useMemo(
    () => dashboard.primitives.filter((primitive) => primitive.chains.includes(selectedChain)),
    [dashboard.primitives, selectedChain],
  );

  const selectedPrimitive = visiblePrimitives.find((primitive) => primitive.id === primitiveId);
  const filteredTransactions = dashboard.transactions.filter((tx) =>
    txFilter === 'all' ? true : tx.status === txFilter,
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
    const response = await sendRuntimeMessage({ type: 'vault:get' });
    if (!response.ok) throw new Error(response.error);
    setDashboard(response.data);
  }

  useEffect(() => {
    run(refresh).finally(() => setLoading(false));
  }, []);

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
    const nextAsset = getChain(selectedChain, dashboard.networkMode).assets[0];
    setSendForm((current) => ({ ...current, assetId: nextAsset.id }));
    setQuote(null);
  }, [dashboard.networkMode, selectedChain]);

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
      chainId: selectedChain,
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
      chainId: selectedChain,
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
      chainId: selectedChain,
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
    return <main className="popup-shell status-only">Loading wallet...</main>;
  }

  if (dashboard.locked) {
    return (
      <TooltipProvider>
        <main className="popup-shell wallet-scroll p-4">
          <section className="mb-4 flex items-center gap-3">
            <div className="brand-orb">
              <Wallet />
            </div>
            <div>
              <h1 className="text-lg font-semibold">WDK Wallet</h1>
              <p className="text-sm text-muted-foreground">Chrome and Brave starter</p>
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>{dashboard.hasVault ? 'Unlock vault' : 'Create vault'}</CardTitle>
              <CardDescription>
                Non-custodial WDK accounts stay encrypted in extension storage.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {!dashboard.hasVault && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="wallet-name">Wallet name</Label>
                    <Input
                      id="wallet-name"
                      value={walletName}
                      onChange={(event) => setWalletName(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="seed-phrase">Seed phrase</Label>
                    <Textarea
                      id="seed-phrase"
                      value={seedPhrase}
                      onChange={(event) => setSeedPhrase(event.target.value)}
                      rows={4}
                      placeholder="Generate a seed or paste an existing BIP-39 phrase"
                    />
                  </div>
                  <Button variant="secondary" onClick={() => generateSeed(setSeedPhrase)} disabled={busy}>
                    <KeyRound data-icon="inline-start" />
                    Generate seed
                  </Button>
                </>
              )}

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
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={dashboard.hasVault ? unlockVault : createVault} disabled={busy}>
                <Lock data-icon="inline-start" />
                {dashboard.hasVault ? 'Unlock' : 'Create encrypted vault'}
              </Button>
            </CardFooter>
          </Card>

          <Alert className="mt-3">
            <Shield />
            <AlertTitle>Encrypted vault</AlertTitle>
            <AlertDescription>
              Seed phrases are protected with 600k PBKDF2-SHA256 iterations and AES-GCM.
            </AlertDescription>
          </Alert>
          {toast && <p className={`toast ${toast.tone}`}>{toast.message}</p>}
        </main>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <main className="popup-shell wallet-scroll">
        <section className="p-4 pb-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="account-orb">
                <Wallet />
              </div>
              <div>
                <h1 className="text-base font-semibold">{activeWallet?.name ?? 'WDK Wallet'}</h1>
                <p className="text-xs text-muted-foreground">
                  Account {selectedAccount + 1} on {chain.networkLabel}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
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

          <div className="grid grid-cols-2 gap-2">
            <Select value={dashboard.networkMode} onValueChange={(value) => switchNetwork(value as NetworkMode)}>
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

            <Select value={selectedChain} onValueChange={(value) => setSelectedChain(value as ChainId)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CHAIN_ORDER.map((chainId) => (
                    <SelectItem key={chainId} value={chainId}>
                      {chains[chainId].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="px-4 pb-3">
          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="flex items-center justify-between gap-2 text-sm">
                <span>{selectedSnapshot?.walletName ?? activeWallet?.name}</span>
                <Badge variant={dashboard.networkMode === 'mainnet' ? 'default' : 'secondary'}>
                  {dashboard.networkMode}
                </Badge>
              </CardTitle>
              <CardDescription className="address-text">
                {selectedSnapshot?.address ?? 'Address unavailable'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2 px-4">
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
                    {Array.from({ length: activeWallet?.accountCount ?? 1 }, (_, index) => (
                      <SelectItem key={index} value={String(index)}>
                        Account {index + 1}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </CardContent>
            <CardFooter className="gap-2 px-4">
              <Button variant="secondary" className="flex-1" onClick={copyAddress}>
                <Copy data-icon="inline-start" />
                Copy
              </Button>
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
            </CardFooter>
          </Card>
        </section>

        <Tabs defaultValue="assets" className="px-4 pb-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="send">Send</TabsTrigger>
            <TabsTrigger value="receive">Receive</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="wdk">WDK</TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="mt-3 flex flex-col gap-3">
            {chain.statusNote && (
              <Alert>
                <Shield />
                <AlertTitle>{chain.networkLabel}</AlertTitle>
                <AlertDescription>{chain.statusNote}</AlertDescription>
              </Alert>
            )}
            {selectedSnapshot?.balances.map((balance) => (
              <Card key={balance.assetId} className="gap-3 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{balance.label}</span>
                    <span>{balance.formatted}</span>
                  </CardTitle>
                  {balance.error && <CardDescription>{balance.error}</CardDescription>}
                </CardHeader>
              </Card>
            ))}
            {selectedSnapshot?.feeRates && (
              <Card className="gap-3 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-sm">Fee rates</CardTitle>
                  <CardDescription>
                    Normal {selectedSnapshot.feeRates.normal} / Fast {selectedSnapshot.feeRates.fast}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
            {selectedSnapshot?.error && (
              <Alert variant="destructive">
                <AlertTitle>Account unavailable</AlertTitle>
                <AlertDescription>{selectedSnapshot.error}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="send" className="mt-3">
            <Card>
              <CardHeader>
                <CardTitle>Send</CardTitle>
                <CardDescription>Address validation follows the selected chain and network mode.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
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
                  <Input
                    id="recipient-address"
                    value={sendForm.to}
                    onChange={(event) => setSendForm((current) => ({ ...current, to: event.target.value }))}
                    placeholder="Recipient address"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="qr-picker">Scan recipient QR image</Label>
                  <Input
                    id="qr-picker"
                    type="file"
                    accept="image/*"
                    aria-label="Scan recipient QR image"
                    onChange={(event) => readRecipientQr(event.target.files?.[0] ?? null)}
                  />
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
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="secondary" className="flex-1" onClick={quoteSend} disabled={busy}>
                  Quote
                </Button>
                <Button className="flex-1" onClick={broadcastSend} disabled={busy}>
                  <Send data-icon="inline-start" />
                  Send
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="receive" className="mt-3">
            <Card>
              <CardHeader>
                <CardTitle>Receive</CardTitle>
                <CardDescription>{chain.networkLabel}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                {receiveQr ? <img className="qr" src={receiveQr} alt="Receive address QR code" /> : <p>No address</p>}
                <p className="address-text text-center text-xs text-muted-foreground">
                  {selectedSnapshot?.address ?? 'Address unavailable'}
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="secondary" onClick={copyAddress}>
                  <Copy data-icon="inline-start" />
                  Copy address
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity />
                  Transactions
                </CardTitle>
                <CardDescription>Submitted transactions are refreshed by the background service worker.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Select value={txFilter} onValueChange={setTxFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter transactions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All transactions</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {filteredTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions yet</p>
                ) : (
                  filteredTransactions.slice(0, 8).map((tx) => (
                    <article key={tx.id} className="flex flex-col gap-2 rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-sm">
                          {tx.assetId} on {getChain(tx.chainId, tx.networkMode).label}
                        </strong>
                        <Badge variant={tx.status === 'failed' ? 'destructive' : 'secondary'}>{tx.status}</Badge>
                      </div>
                      <p className="tx-hash text-xs text-muted-foreground">{tx.error ?? tx.hash ?? tx.to}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wdk" className="mt-3">
            <Card>
              <CardHeader>
                <CardTitle>WDK primitives</CardTitle>
                <CardDescription>
                  Advanced console for installed WDK modules: core, wallet, EVM, Bitcoin, and Spark.
                </CardDescription>
                <CardAction>
                  <Badge variant="outline">{visiblePrimitives.length} ops</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
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
                  />
                </div>
                {primitiveResult && (
                  <>
                    <Separator />
                    <pre className="result-box rounded-lg bg-muted p-3 text-xs">{primitiveResult}</pre>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={executePrimitive} disabled={busy}>
                  Execute primitive
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        {toast && <p className={`toast ${toast.tone}`}>{toast.message}</p>}
      </main>
    </TooltipProvider>
  );
}

export default App;
