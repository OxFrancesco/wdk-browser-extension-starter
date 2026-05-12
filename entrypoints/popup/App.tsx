import { useEffect, useMemo, useState } from 'react';
import * as QRCode from 'qrcode';
import {
  Copy,
  KeyRound,
  Lock,
  Plus,
  RefreshCcw,
  Send,
  Shield,
  Wallet,
} from 'lucide-react';

import { CHAINS } from '@/src/lib/chains';
import { sendRuntimeMessage } from '@/src/lib/messages';
import type { AccountSnapshot, ChainId, DashboardState, SendRequest } from '@/src/lib/types';
import './App.css';

type Toast = { tone: 'success' | 'error'; message: string } | null;

const emptyDashboard: DashboardState = {
  locked: true,
  hasVault: false,
  activeWalletId: null,
  sessionExpiresAt: null,
  wallets: [],
  accounts: [],
  transactions: [],
};

function shortAddress(address: string): string {
  if (!address) return 'Unavailable';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function App() {
  const [dashboard, setDashboard] = useState<DashboardState>(emptyDashboard);
  const [password, setPassword] = useState('');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [walletName, setWalletName] = useState('Primary wallet');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [selectedChain, setSelectedChain] = useState<ChainId>('ethereum');
  const [selectedAccount, setSelectedAccount] = useState(0);
  const [receiveQr, setReceiveQr] = useState('');
  const [sendForm, setSendForm] = useState({ to: '', amount: '', assetId: 'USDT' });
  const [quote, setQuote] = useState<string | null>(null);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('Imported wallet');
  const [newWalletSeed, setNewWalletSeed] = useState('');

  const activeWallet = dashboard.wallets.find((wallet) => wallet.id === dashboard.activeWalletId);
  const chain = CHAINS[selectedChain];
  const selectedAsset = chain.assets.find((asset) => asset.id === sendForm.assetId) ?? chain.assets[0];

  const selectedSnapshot = useMemo<AccountSnapshot | undefined>(
    () =>
      dashboard.accounts.find(
        (account) => account.chainId === selectedChain && account.accountIndex === selectedAccount,
      ),
    [dashboard.accounts, selectedAccount, selectedChain],
  );

  async function run<T>(task: () => Promise<T>, success?: string): Promise<T | undefined> {
    setToast(null);
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

    QRCode.toDataURL(selectedSnapshot.address, { margin: 1, width: 160 })
      .then(setReceiveQr)
      .catch(() => setReceiveQr(''));
  }, [selectedSnapshot?.address]);

  useEffect(() => {
    const nextAsset = CHAINS[selectedChain].assets[0];
    setSendForm((current) => ({ ...current, assetId: nextAsset.id }));
    setQuote(null);
  }, [selectedChain]);

  useEffect(() => {
    if (activeWallet && selectedAccount >= activeWallet.accountCount) {
      setSelectedAccount(0);
    }
  }, [activeWallet, selectedAccount]);

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
    }, 'Vault created');
  }

  async function unlockVault() {
    await run(async () => {
      const response = await sendRuntimeMessage({ type: 'vault:unlock', password });
      if (!response.ok) throw new Error(response.error);
      setDashboard(response.data);
    }, 'Wallet unlocked');
  }

  async function generateSeed() {
    await run(async () => {
      const response = await sendRuntimeMessage({ type: 'wallet:generateSeed' });
      if (!response.ok) throw new Error(response.error);
      setSeedPhrase(response.data);
    });
  }

  async function generateNewWalletSeed() {
    await run(async () => {
      const response = await sendRuntimeMessage({ type: 'wallet:generateSeed' });
      if (!response.ok) throw new Error(response.error);
      setNewWalletSeed(response.data);
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
      setShowAddWallet(false);
    }, 'Wallet added');
  }

  async function switchWallet(walletId: string) {
    await run(async () => {
      const response = await sendRuntimeMessage({ type: 'wallet:setActive', walletId });
      if (!response.ok) throw new Error(response.error);
      setDashboard(response.data);
      setSelectedAccount(0);
      setQuote(null);
    });
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
      <main className="popup-shell auth">
        <section className="brand-row">
          <div className="brand-mark">
            <Wallet size={20} />
          </div>
          <div>
            <h1>WDK Wallet</h1>
            <p>Chrome and Brave starter</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <KeyRound size={18} />
            <h2>{dashboard.hasVault ? 'Unlock vault' : 'Create vault'}</h2>
          </div>

          {!dashboard.hasVault && (
            <>
              <label>
                Wallet name
                <input value={walletName} onChange={(event) => setWalletName(event.target.value)} />
              </label>
              <label>
                Seed phrase
                <textarea
                  value={seedPhrase}
                  onChange={(event) => setSeedPhrase(event.target.value)}
                  rows={4}
                  placeholder="Generate a seed or paste an existing BIP-39 phrase"
                />
              </label>
              <button className="secondary" onClick={generateSeed}>
                Generate seed
              </button>
            </>
          )}

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 10 characters"
            />
          </label>
          <button className="primary" onClick={dashboard.hasVault ? unlockVault : createVault}>
            <Lock size={16} />
            {dashboard.hasVault ? 'Unlock' : 'Create encrypted vault'}
          </button>
        </section>

        <section className="security-strip">
          <Shield size={16} />
          <span>Seed phrases are encrypted with PBKDF2 and AES-GCM in extension storage.</span>
        </section>
        {toast && <p className={`toast ${toast.tone}`}>{toast.message}</p>}
      </main>
    );
  }

  return (
    <main className="popup-shell">
      <header className="topbar">
        <section>
          <h1>{activeWallet?.name ?? 'WDK Wallet'}</h1>
          <p>{dashboard.wallets.length} wallet profile</p>
        </section>
        <div className="icon-actions">
          <button title="Refresh" onClick={() => run(refresh, 'Balances refreshed')}>
            <RefreshCcw size={16} />
          </button>
          <button
            title="Lock"
            onClick={() =>
              run(async () => {
                const response = await sendRuntimeMessage({ type: 'vault:lock' });
                if (!response.ok) throw new Error(response.error);
                setDashboard(response.data);
              })
            }
          >
            <Lock size={16} />
          </button>
        </div>
      </header>

      <section className="wallet-row">
        <select
          value={dashboard.activeWalletId ?? ''}
          onChange={(event) => switchWallet(event.target.value)}
        >
          {dashboard.wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name}
            </option>
          ))}
        </select>
        <button title="Add wallet" onClick={() => setShowAddWallet((value) => !value)}>
          <Plus size={16} />
        </button>
      </section>

      {showAddWallet && (
        <section className="panel compact wallet-form">
          <h2>Add wallet</h2>
          <input
            value={newWalletName}
            onChange={(event) => setNewWalletName(event.target.value)}
            placeholder="Wallet name"
          />
          <textarea
            value={newWalletSeed}
            onChange={(event) => setNewWalletSeed(event.target.value)}
            rows={3}
            placeholder="Generate a seed or paste an existing BIP-39 phrase"
          />
          <div className="button-row">
            <button className="secondary" onClick={generateNewWalletSeed}>
              Generate
            </button>
            <button className="primary" onClick={addWallet}>
              Add wallet
            </button>
          </div>
        </section>
      )}

      <section className="controls-row">
        <select value={selectedChain} onChange={(event) => setSelectedChain(event.target.value as ChainId)}>
          {Object.values(CHAINS).map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={selectedAccount}
          onChange={(event) => setSelectedAccount(Number(event.target.value))}
        >
          {Array.from({ length: activeWallet?.accountCount ?? 1 }, (_, index) => (
            <option key={index} value={index}>
              Account {index + 1}
            </option>
          ))}
        </select>
        <button title="Add account" onClick={addAccount}>
          <Plus size={16} />
        </button>
      </section>

      <section className="address-panel">
        <div>
          <p className="eyebrow">{selectedSnapshot?.chainLabel}</p>
          <h2>{shortAddress(selectedSnapshot?.address ?? '')}</h2>
        </div>
        <button title="Copy address" onClick={copyAddress}>
          <Copy size={16} />
        </button>
      </section>

      <section className="balance-list">
        {selectedSnapshot?.balances.map((balance) => (
          <article key={balance.assetId} className="balance-item">
            <div>
              <span>{balance.label}</span>
              {balance.error && <small>{balance.error}</small>}
            </div>
            <strong>{balance.formatted}</strong>
          </article>
        ))}
        {selectedSnapshot?.error && <p className="inline-error">{selectedSnapshot.error}</p>}
      </section>

      <section className="two-column">
        <section className="panel compact">
          <h2>Receive</h2>
          {receiveQr ? <img className="qr" src={receiveQr} alt="Receive address QR code" /> : <p>No address</p>}
        </section>

        <section className="panel compact">
          <h2>Send</h2>
          <select
            value={sendForm.assetId}
            onChange={(event) => setSendForm((current) => ({ ...current, assetId: event.target.value }))}
          >
            {chain.assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.label}
              </option>
            ))}
          </select>
          <input
            value={sendForm.to}
            onChange={(event) => setSendForm((current) => ({ ...current, to: event.target.value }))}
            placeholder="Recipient address"
          />
          <input
            type="file"
            accept="image/*"
            aria-label="Scan recipient QR image"
            onChange={(event) => readRecipientQr(event.target.files?.[0] ?? null)}
          />
          <input
            value={sendForm.amount}
            onChange={(event) => setSendForm((current) => ({ ...current, amount: event.target.value }))}
            placeholder="Amount"
          />
          {quote && <small>{quote}</small>}
          <div className="button-row">
            <button className="secondary" onClick={quoteSend}>
              Quote
            </button>
            <button className="primary" onClick={broadcastSend}>
              <Send size={14} />
              Send
            </button>
          </div>
        </section>
      </section>

      <section className="panel compact history">
        <h2>Transactions</h2>
        {dashboard.transactions.length === 0 ? (
          <p>No transactions yet</p>
        ) : (
          dashboard.transactions.slice(0, 5).map((tx) => (
            <article key={tx.id} className="tx-row">
              <div>
                <span>
                  {tx.assetId} on {CHAINS[tx.chainId].label}
                </span>
                <small>{tx.error ?? tx.hash ?? tx.to}</small>
              </div>
              <strong>{tx.status}</strong>
            </article>
          ))
        )}
      </section>

      {toast && <p className={`toast ${toast.tone}`}>{toast.message}</p>}
    </main>
  );
}

export default App;
