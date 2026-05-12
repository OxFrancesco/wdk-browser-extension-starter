# WDK Browser Extension Starter

Reference Chrome and Brave wallet extension built with WXT, React, TypeScript, Tailwind, shadcn/Radix UI components, and the local Tether WDK codebase in `docs/wdk`.

Public repository: https://github.com/OxFrancesco/wdk-browser-extension-starter

## Stack

- WXT Manifest V3 extension framework
- React + TypeScript popup UI with shadcn/Radix components
- Tether WDK core from `file:docs/wdk`
- WDK wallet modules for EVM, Bitcoin, Spark, and Solana
- `@wxt-dev/storage` for extension-local encrypted vault storage
- WebCrypto PBKDF2-SHA256 + AES-256-GCM for seed phrase vault encryption
- Mainnet/testnet chain registry for every supported wallet network
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
npm run demo:record
npm run zip
```

## Architecture

- `entrypoints/popup`: shadcn-based wallet UX for create/import, unlock, mainnet/testnet switching, balances, receive QR, send, filtered activity, and the WDK primitive console.
- `entrypoints/background.ts`: privileged wallet runtime. It keeps decrypted seed phrases only in the service worker session, enforces lock/session timeout, persists encrypted vault data, derives WDK accounts, handles network switching, and routes send/quote/primitive actions.
- `entrypoints/content.ts`: constrained HTTPS page bridge. It only exposes lock/status data and never exposes accounts, balances, seeds, signing, or broadcast APIs to arbitrary pages.
- `src/lib/wdk-adapter.ts`: WDK integration layer. It registers Bitcoin, Spark, EVM, Plasma, and Solana managers with the selected mainnet/testnet config, normalizes balances/addresses/quotes/sends, and exposes installed WDK primitives through a typed executor.
- `src/lib/validation.ts`: automatic recipient address validation for EVM, Bitcoin, Solana, and Spark before quote or broadcast.
- `src/lib/tx-monitor.ts`: background transaction status refresh for submitted EVM, Bitcoin, and Solana transactions.
- `src/lib/vault-crypto.ts`: password-based vault encryption.
- `src/lib/chains.ts`: mainnet/testnet network and asset registry for BTC, USDt, XAUt, and native gas assets.

## Security Notes

See `docs/SECURITY.md` for the fuller extension-specific security checklist.

- New vaults require a 12-character minimum password.
- Seed phrases are encrypted with PBKDF2-SHA256 at 600,000 iterations and AES-256-GCM before storage.
- Older vault envelopes decrypt with their stored KDF settings and are upgraded to the current work factor after a successful unlock.
- The popup never reads encrypted vault contents directly; it communicates through typed runtime messages.
- The background session auto-locks after `sessionTimeoutMinutes` and retains a non-extractable WebCrypto key instead of the plaintext password.
- The production bundle excludes broad Node `crypto`/`vm` polyfills and maps Node-style crypto fallbacks to a narrow WebCrypto/Noble shim.
- Content scripts do not receive private keys, seed phrases, account addresses, or balances.
- Manifest host permissions are limited to explicit HTTPS RPC/indexer/operator endpoints for the configured networks.
- Recipient addresses are validated per network before a quote or broadcast is attempted.
- Live sends are routed through WDK wallet modules and fail closed when a module or RPC is not configured.
- Plasma mainnet and testnet RPCs are configured; production wallets should still replace public endpoints with owned RPC infrastructure.

## Current WDK Coverage

The starter uses the WDK APIs available in the local beta codebase:

- Seed phrase generation and validation
- Multi-wallet and multi-account derivation
- Mainnet/testnet registration for EVM, Bitcoin, Spark, and Solana WDK wallet modules across Bitcoin, Spark, Ethereum, Polygon, Arbitrum, Plasma, and Solana
- Address derivation for supported networks
- Native/token balance lookups where the wallet module exposes providers
- Send quotes and broadcasts where the selected module exposes those methods
- Transaction status refresh for submitted transactions with supported public status endpoints
- Mainnet/testnet switching for Bitcoin, Spark, Ethereum, Polygon, Arbitrum, Plasma, and Solana
- Popup WDK primitive console for installed WDK account primitives, including core account/fee methods, common wallet actions, EVM signing/approval/delegation helpers, Bitcoin max-spendable lookup, and Spark deposit, invoice, Lightning, withdraw, and sync operations

Lifecycle and wiring primitives such as wallet registration, protocol registration, middleware registration, and disposal are owned by the background runtime instead of being exposed to the page or popup console. Some behavior depends on public RPC/indexer availability and funded accounts. Production teams should replace public endpoints with owned infrastructure before shipping.
The local WDK docs also reference optional modules such as TON and TRON; those packages are not installed in this starter, so their primitives are documented as out of scope until the matching WDK modules are added.

## Submission Helpers

- Acceptance audit: `docs/ACCEPTANCE_AUDIT.md`
- Demo recording outline: `docs/DEMO.md`
- Browser E2E screenshot: `docs/browser-e2e-popup.png`
