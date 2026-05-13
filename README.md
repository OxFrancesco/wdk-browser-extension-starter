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
- MetaMask-compatible EIP-1193 website provider for EVM dApps
- Mainnet/testnet chain registry for every supported wallet network
- Encrypted per-vault custom RPC preferences for supported mainnet/testnet chains
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
- `entrypoints/content.ts`: constrained HTTPS page bridge. It injects the EIP-1193 provider, bridges approved EVM dApp requests to the background runtime, and keeps seed/private-key material out of page context.
- `public/ethereum-provider.js` and `public/connect.html`: page-context `window.ethereum` provider plus extension-owned approval UI for connect, sign, typed-data, and transaction requests.
- `src/lib/wdk-adapter.ts`: WDK integration layer. It registers Bitcoin, Spark, EVM, Plasma, and Solana managers with the selected mainnet/testnet config plus encrypted RPC preferences, normalizes balances/addresses/quotes/sends, and exposes installed WDK primitives through a typed executor.
- `src/lib/validation.ts`: automatic recipient address validation for EVM, Bitcoin, Solana, and Spark before quote or broadcast.
- `src/lib/tx-monitor.ts`: background transaction status refresh for submitted EVM, Bitcoin, and Solana transactions.
- `src/lib/vault-crypto.ts`: password-based vault encryption.
- `src/lib/chains.ts`: mainnet/testnet network, asset, built-in RPC, and custom RPC preference helpers for BTC, USDt, XAUt, and native gas assets.

## Security Notes

See `docs/SECURITY.md` for the fuller extension-specific security checklist.

- New vaults require a 12-character minimum password.
- Seed phrases are encrypted with PBKDF2-SHA256 at 600,000 iterations and AES-256-GCM before storage.
- Older vault envelopes decrypt with their stored KDF settings and are upgraded to the current work factor after a successful unlock.
- The popup never reads encrypted vault contents directly; it communicates through typed runtime messages.
- The background session auto-locks after `sessionTimeoutMinutes` and retains a non-extractable WebCrypto key instead of the plaintext password.
- The production bundle excludes broad Node `crypto`/`vm` polyfills and maps Node-style crypto fallbacks to a narrow WebCrypto/Noble shim.
- Content scripts do not receive private keys, seed phrases, account addresses, or balances.
- Websites only receive EVM accounts after an extension-owned approval window grants the origin. Signatures and transaction broadcasts require separate approval prompts.
- Manifest host permissions are limited to explicit HTTPS RPC/indexer/operator endpoints for the configured networks.
- Custom RPC URLs are HTTPS-only, stored inside the encrypted vault, and require optional host permission for the RPC origin before use.
- Dapp-added EVM networks are stored as encrypted `eip155:<chainId>` custom chains only after user approval, HTTPS RPC validation, host permission, and an `eth_chainId` consistency check against every submitted RPC URL.
- Recipient addresses are validated per network before a quote or broadcast is attempted.
- Live sends are routed through WDK wallet modules and fail closed when a module or RPC is not configured.
- Plasma mainnet and testnet RPCs are configured; production wallets should still replace public endpoints with owned RPC infrastructure.

## Current WDK Coverage

The starter uses the WDK APIs available in the local beta codebase:

- Seed phrase generation and validation
- Multi-wallet and multi-account derivation
- Mainnet/testnet registration for EVM, Bitcoin, Spark, and Solana WDK wallet modules across Bitcoin, Spark, Ethereum, Polygon, Arbitrum, Plasma, and Solana
- Per-chain custom RPC URLs for Bitcoin Blockbook, EVM, and Solana mainnet/testnet profiles, with user-added URLs tried before built-in fallbacks
- EVM dApp connection via `window.ethereum` / EIP-1193 for Ethereum, Polygon, Arbitrum, Plasma, allow-listed dapp networks such as Base, and approved custom EIP-155 networks, including `eth_requestAccounts`, `eth_accounts`, `eth_chainId`, `wallet_switchEthereumChain`, `wallet_addEthereumChain`, selected read-only JSON-RPC proxy methods, `personal_sign`, `eth_signTypedData_v4`, and `eth_sendTransaction`
- Address derivation for supported networks
- Native/token balance lookups where the wallet module exposes providers
- Send quotes and broadcasts where the selected module exposes those methods
- Transaction status refresh for submitted transactions with supported public status endpoints
- Mainnet/testnet switching for Bitcoin, Spark, Ethereum, Polygon, Arbitrum, Plasma, and Solana
- Multiple custom EVM mainnet/testnet chains can be added by dapps through `wallet_addEthereumChain`, registered dynamically with WDK, selected in the popup, and removed from the RPC settings sheet; trusted known chains can also be auto-added when a dapp requests that chain
- Popup WDK primitive console for installed WDK account primitives, including core account/fee methods, common wallet actions, EVM signing/approval/delegation helpers, Bitcoin max-spendable lookup, and Spark deposit, invoice, Lightning, withdraw, and sync operations

Lifecycle and wiring primitives such as wallet registration, protocol registration, middleware registration, and disposal are owned by the background runtime instead of being exposed to the page or popup console. Some behavior depends on public RPC/indexer availability and funded accounts. Production teams should replace public endpoints with owned infrastructure before shipping.
The local WDK docs also reference optional modules such as TON and TRON; those packages are not installed in this starter, so their primitives are documented as out of scope until the matching WDK modules are added.

## Submission Helpers

- Acceptance audit: `docs/ACCEPTANCE_AUDIT.md`
- Demo recording outline: `docs/DEMO.md`
- Browser E2E screenshot: `docs/browser-e2e-popup.png`
