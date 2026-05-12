# Demo Script

Recorded demo: `docs/browser-demo.webm`.

To regenerate it from the unpacked Chrome build:

```bash
npm run build
npm run demo:record
```

Use this outline for a narrated 2-5 minute demonstration video.

1. Open `chrome://extensions` or `brave://extensions`, enable Developer Mode, and load `.output/chrome-mv3`.
2. Open the WDK Wallet popup.
3. Generate a seed phrase, enter a password with at least 12 characters, and create the encrypted vault.
4. Switch between Mainnet and Testnet, then move between Bitcoin, Spark, Ethereum, Polygon, Arbitrum, Plasma, and Solana.
5. Add a second account and show that account addresses are derived separately.
6. Add a second wallet from the sheet and switch back to the first wallet.
7. Copy a receive address and show its QR code.
8. Use the send form with an invalid address to show automatic network validation.
9. Use the QR image picker to import a recipient address from a QR image.
10. Open the WDK tab, execute a safe read primitive such as address lookup, and show the JSON result.
11. Quote or submit a transaction on a funded test wallet/network.
12. Show the activity filter and explain the background status refresh.
13. Lock and unlock the wallet to demonstrate password/session protection.

For a production submission, record against funded development wallets and owned RPC/indexer endpoints.
