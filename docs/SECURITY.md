# Security Notes

This starter is intended as a browser-extension reference implementation, not a production wallet policy.

## Seed Phrase Handling

- Seed phrases are validated with WDK before vault creation or import.
- New vaults require a 12-character minimum password.
- The persisted vault is encrypted with PBKDF2-SHA256 at 600,000 iterations and AES-256-GCM in `src/lib/vault-crypto.ts`.
- Existing vault envelopes decrypt with their stored KDF settings and are re-encrypted with the current work factor after a successful unlock.
- The decrypted vault and non-extractable WebCrypto key are kept only in the background service worker session.
- The plaintext password is not retained after create/unlock.
- The popup receives public wallet/account state only; seed phrases are not returned through runtime messages.
- Manual lock clears the decrypted session. Expired sessions are cleared when privileged actions run.

## Extension Boundaries

- The background script owns WDK account derivation, signing, quoting, broadcasting, and transaction monitoring.
- Manifest host permissions are restricted to explicit HTTPS RPC/indexer/operator endpoints used by the configured mainnet/testnet networks.
- Custom RPC URLs are allowed only for HTTPS origins, cannot include embedded credentials, are stored in the encrypted vault, and use MV3 optional host permissions per origin instead of broad default access.
- The content script only runs on HTTPS pages. It injects a page-context EIP-1193 provider, but privileged work stays in the background service worker.
- EVM dApp origins must be approved before account exposure. Message signing, typed-data signing, and transaction broadcasts open separate extension-owned approval windows.
- Extension CSP only allows self-hosted scripts plus `wasm-unsafe-eval` for WDK/WASM dependencies; remote scripts and extension-page framing are blocked.
- The WXT/Vite build excludes broad Node `crypto`/`vm` polyfills. Service-worker crypto fallback paths use a narrow WebCrypto/Noble shim instead of `crypto-browserify` or `vm-browserify`.
- Recipient addresses are validated per network before quoting or broadcasting.
- Network/provider failures fail closed with user-facing errors.
- WDK primitive execution is routed through typed background messages. The popup asks for confirmation before mutating primitive execution. Wallet/protocol registration, middleware registration, and disposal stay internal to the background runtime.

## Known Production Hardening Work

- Replace public RPC/indexer endpoints with controlled infrastructure.
- Add RPC health scoring, latency checks, and per-origin risk labeling before promoting custom endpoints to production defaults.
- Pin final Plasma token metadata and use dedicated Plasma RPC access before production release.
- Provide compatible Spark infrastructure for test-mode/regtest workflows.
- Add richer transaction simulation, spender risk checks, and persistent per-origin management before production dApp signing rollout.
- Add hardware-wallet or passkey-backed unlock options if required by product policy.
- Move the extension icon assets from WXT placeholders to final brand assets before submission.
- Track the low-severity `elliptic` advisory chain currently pulled through `@tetherto/wdk-wallet-btc -> bitcoinjs-message -> secp256k1 -> elliptic`.
- Re-audit upstream Spark/WASM bundles when WDK packages update; the current visible-browser E2E flow passes under the MV3 CSP.
