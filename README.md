# WDK Browser Extension Starter

Reference Chrome and Brave wallet extension built with WXT, React, TypeScript, Tailwind, and the local Tether WDK codebase in `docs/wdk`.

Public repository: https://github.com/OxFrancesco/wdk-browser-extension-starter

## Stack

- WXT Manifest V3 extension framework
- React + TypeScript popup UI
- Tether WDK core from `file:docs/wdk`
- WDK wallet modules for EVM, Bitcoin, Spark, and Solana
- `@wxt-dev/storage` for extension-local encrypted vault storage
- WebCrypto PBKDF2 + AES-GCM for seed phrase vault encryption
- Vitest for focused utility tests

## Setup

```bash
npm install
npm run dev
```

Load the generated `.output/chrome-mv3` directory in Chrome or Brave from `chrome://extensions` with Developer Mode enabled.

Production build:

```bash
npm run compile
npm test
npm run build
npm run test:browser
npm run zip
```

## Architecture

- `entrypoints/popup`: wallet UX for create/import, unlock, balances, receive QR, send, and history.
- `entrypoints/background.ts`: privileged wallet runtime. It keeps decrypted seed phrases only in the service worker session, enforces lock/session timeout, persists encrypted vault data, derives WDK accounts, and handles send/quote actions.
- `entrypoints/content.ts`: constrained page bridge. It only exposes lock/status data and never exposes seeds, signing, or broadcast APIs to arbitrary pages.
- `src/lib/wdk-adapter.ts`: WDK integration layer. It registers Bitcoin, Spark, EVM, Plasma, and Solana networks and normalizes balances, addresses, quotes, and sends.
- `src/lib/validation.ts`: automatic recipient address validation for EVM, Bitcoin, Solana, and Spark before quote or broadcast.
- `src/lib/tx-monitor.ts`: background transaction status refresh for submitted EVM, Bitcoin, and Solana transactions.
- `src/lib/vault-crypto.ts`: password-based vault encryption.
- `src/lib/chains.ts`: network and asset registry for BTC, USDt, XAUt, and native gas assets.

## Security Notes

See `docs/SECURITY.md` for the fuller extension-specific security checklist.

- Seed phrases are encrypted with PBKDF2-SHA256 and AES-GCM before storage.
- The popup never reads encrypted vault contents directly; it communicates through typed runtime messages.
- The background session auto-locks after `sessionTimeoutMinutes`.
- Content scripts do not receive private keys or seed phrases.
- Recipient addresses are validated per network before a quote or broadcast is attempted.
- Live sends are routed through WDK wallet modules and fail closed when a module or RPC is not configured.
- Plasma is included as a network slot, but live broadcasts are disabled until a production RPC/chain configuration is supplied.

## Current WDK Coverage

The starter uses the WDK APIs available in the local beta codebase:

- Seed phrase generation and validation
- Multi-wallet and multi-account derivation
- EVM, Bitcoin, Spark, and Solana account registration
- Address derivation for supported networks
- Native/token balance lookups where the wallet module exposes providers
- Send quotes and broadcasts where the selected module exposes those methods
- Transaction status refresh for submitted transactions with supported public status endpoints

Some behavior depends on public RPC or indexer availability. Production teams should replace public endpoints with owned infrastructure before shipping.

## Submission Helpers

- Acceptance audit: `docs/ACCEPTANCE_AUDIT.md`
- Demo recording outline: `docs/DEMO.md`
- Browser E2E screenshot: `docs/browser-e2e-popup.png`
