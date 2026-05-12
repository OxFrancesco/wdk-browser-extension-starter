# Security Notes

This starter is intended as a browser-extension reference implementation, not a production wallet policy.

## Seed Phrase Handling

- Seed phrases are validated with WDK before vault creation or import.
- The persisted vault is encrypted with PBKDF2-SHA256 and AES-GCM in `src/lib/vault-crypto.ts`.
- The decrypted vault is kept only in the background service worker session.
- The popup receives public wallet/account state only; seed phrases are not returned through runtime messages.
- Manual lock clears the decrypted session. Expired sessions are cleared when privileged actions run.

## Extension Boundaries

- The background script owns WDK account derivation, signing, quoting, broadcasting, and transaction monitoring.
- The content script only answers `wallet:status` page messages and never exposes seed phrases, signing, or send/broadcast actions.
- Recipient addresses are validated per network before quoting or broadcasting.
- Network/provider failures fail closed with user-facing errors.

## Known Production Hardening Work

- Replace public RPC/indexer endpoints with controlled infrastructure.
- Add explicit allowlists and origin prompts before exposing dApp signing APIs.
- Add hardware-wallet or passkey-backed unlock options if required by product policy.
- Move the extension icon assets from WXT placeholders to final brand assets before submission.
- Review the low-severity `elliptic` advisory chain currently pulled through WDK Bitcoin dependencies.
