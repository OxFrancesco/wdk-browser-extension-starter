# Acceptance Audit

Objective: produce the browser-extension wallet starter described in `docs/Browser-Extension-Starter.pdf`, using the local WDK codebase in `docs/wdk`.

## Checklist

| Requirement | Evidence | Status |
| --- | --- | --- |
| Chrome/Brave browser extension wallet | WXT Manifest V3 build in `.output/chrome-mv3`, manifest name `WDK Browser Wallet Starter` | Implemented |
| Uses WDK | `@tetherto/wdk` is installed from `file:docs/wdk`; integration in `src/lib/wdk-adapter.ts` | Implemented |
| Clean minimal popup UI | MetaMask-style React popup in `entrypoints/popup/App.tsx` and `entrypoints/popup/App.css` | Implemented |
| shadcn components | `components.json`, `src/components/ui/*`, and popup imports from shadcn/Radix components | Implemented |
| Background scripts | `entrypoints/background.ts` service worker | Implemented |
| Message passing | Typed runtime messages in `src/lib/messages.ts`; background listener in `entrypoints/background.ts` | Implemented |
| Secure storage | `@wxt-dev/storage` plus PBKDF2-SHA256 600k/AES-256-GCM vault encryption in `src/lib/vault-crypto.ts` | Implemented |
| Seed generation, recovery, validation | `generateSeedPhrase` and `assertValidSeedPhrase` in `src/lib/wdk-adapter.ts`; create/import popup flow | Implemented |
| Password lock and session timeout | `vault:create`, `vault:unlock`, `vault:lock`, plaintext password clearing, non-extractable session key, and session expiry logic in `entrypoints/background.ts` | Implemented |
| Phishing/script-injection protection notes | HTTPS-only restricted content bridge in `entrypoints/content.ts`, explicit HTTPS host permissions and CSP in `wxt.config.ts`; documented in `docs/SECURITY.md` | Implemented as starter guidance |
| Multiple wallets | Popup wallet selector/add sheet in `entrypoints/popup/App.tsx`; background `wallet:add` and `wallet:setActive`; browser E2E verifies a second wallet | Implemented |
| Multiple accounts per wallet | Popup Add Account button and background `wallet:addAccount` | Implemented |
| BTC, USDt, XAUt support | Asset registry in `src/lib/chains.ts`; test coverage in `src/lib/chains.test.ts` | Implemented |
| Bitcoin, Spark, Ethereum, Polygon, Arbitrum, Plasma, Solana | Chain registry in `src/lib/chains.ts`; WDK registration in `src/lib/wdk-adapter.ts` | Implemented |
| Mainnet and testnet support | `NetworkMode` model in `src/lib/types.ts`; dual configs in `src/lib/chains.ts`; `network:set` handling in `entrypoints/background.ts`; browser E2E switches modes | Implemented |
| Custom RPC support | Encrypted `rpcPreferences` in the vault, HTTPS URL validation in `src/lib/chains.ts`, optional host permissions in `wxt.config.ts`, and RPC settings sheet in `entrypoints/popup/App.tsx` | Implemented for Bitcoin Blockbook, EVM, and Solana profiles |
| Website dApp connection | `public/ethereum-provider.js` injects `window.ethereum`; `entrypoints/content.ts` bridges EIP-1193 requests; `entrypoints/background.ts` enforces per-origin approval; browser E2E approves `eth_requestAccounts` from an HTTPS page | Implemented for EVM dApps |
| WDK primitives from installed modules | `WDK_PRIMITIVES` and `executePrimitive` in `src/lib/wdk-adapter.ts`; popup WDK tab; `primitive:execute` runtime handler | Implemented for installed WDK modules; lifecycle registration/disposal is internal |
| Transaction history | `TransactionRecord` model and popup activity section | Implemented |
| Transaction history filtering | Activity status filter in `entrypoints/popup/App.tsx` | Implemented |
| Real-time transaction status monitoring | `src/lib/tx-monitor.ts`; background alarm refresh in `entrypoints/background.ts` | Implemented for submitted EVM, Bitcoin, Solana hashes |
| Send any supported cryptocurrency | Native/token send paths in `src/lib/wdk-adapter.ts` where WDK module exposes methods | Partially dependent on WDK module/provider support |
| Manual/pasted address input | Send form recipient input in popup | Implemented |
| QR-based address input | QR image picker in popup using `@zxing/browser` | Implemented |
| Automatic address/network validation | `src/lib/validation.ts` and `src/lib/validation.test.ts` | Implemented |
| Documentation | `README.md`, `docs/SECURITY.md`, `docs/DEMO.md`, this audit | Implemented |
| Build instructions | `README.md` setup/build section | Implemented |
| Demo video | `docs/browser-demo.webm`; reproducible with `npm run demo:record` | Recorded |
| Public GitHub repository | `https://github.com/OxFrancesco/wdk-browser-extension-starter` | Implemented |
| Pull request to Tether repo | `https://github.com/tetherto/wdk-examples/pull/7` | Opened |

## Verification Commands

Last verified locally:

```bash
npm run compile
npm test
npm run build
npm run test:browser
npm run demo:record
npm run zip
npm audit --omit=dev
npx shadcn@latest info --json
```

The generated installable extension directory is `.output/chrome-mv3`.
The generated zip is `.output/wdk-browser-extension-starter-0.0.0-chrome.zip`.
The browser E2E screenshot is `docs/browser-e2e-popup.png`.
The recorded demo video is `docs/browser-demo.webm`.
The public repository is `https://github.com/OxFrancesco/wdk-browser-extension-starter`.
The Tether examples pull request is `https://github.com/tetherto/wdk-examples/pull/7`.

## Known Residual Risks

- Public RPC/indexer endpoints are suitable for a starter/demo, not production.
- Custom RPC URLs require user-granted host permission and are HTTPS-only; production defaults should still use owned, monitored infrastructure.
- Plasma mainnet/testnet RPCs are configured, but production wallets should use dedicated RPC access and final token metadata.
- WDK beta package APIs determine live balance, quote, signing, primitive execution, and broadcast behavior.
- The EIP-1193 website provider currently covers EVM dApps. Solana, Bitcoin, and Spark website connection standards are separate follow-up integrations.
- Spark test mode is wired to the WDK Spark regtest network and requires matching Spark infrastructure for live transaction flows.
- The local WDK docs reference optional TON/TRON modules, but those packages are not installed in this starter. Their primitives become in scope after adding the corresponding WDK wallet modules.
- `npm audit --omit=dev` reports low-severity advisories through Bitcoin wallet dependencies.
- Reviewers should treat the included demo as a generated walkthrough; production submissions can replace it with a narrated recording against funded development wallets and owned RPC/indexer endpoints.
