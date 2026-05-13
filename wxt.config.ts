import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { fileURLToPath } from 'node:url';

const projectPath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'WDK Browser Wallet Starter',
    description:
      'Reference Chrome and Brave extension wallet built with WXT and Tether WDK.',
    permissions: ['storage', 'alarms', 'clipboardWrite'],
    optional_host_permissions: ['https://*/*'],
    host_permissions: [
      'https://0.spark.lightspark.com/*',
      'https://2.spark.flashnet.xyz/*',
      'https://api.devnet.solana.com/*',
      'https://api.lightspark.com/*',
      'https://api.mainnet-beta.solana.com/*',
      'https://api.sparkscan.io/*',
      'https://arb1.arbitrum.io/*',
      'https://arbitrum-one-rpc.publicnode.com/*',
      'https://arbitrum-sepolia-rpc.publicnode.com/*',
      'https://base-rpc.publicnode.com/*',
      'https://btc1.trezor.io/*',
      'https://eth.llamarpc.com/*',
      'https://ethereum-rpc.publicnode.com/*',
      'https://ethereum-sepolia-rpc.publicnode.com/*',
      'https://mempool.space/*',
      'https://polygon-amoy-bor-rpc.publicnode.com/*',
      'https://polygon-bor-rpc.publicnode.com/*',
      'https://polygon-rpc.com/*',
      'https://regtest-mempool.us-west-2.sparkinfra.net/*',
      'https://rpc-amoy.polygon.technology/*',
      'https://rpc.plasma.to/*',
      'https://rpc.sepolia.org/*',
      'https://sepolia-rollup.arbitrum.io/*',
      'https://spark-operator.breez.technology/*',
      'https://tbtc1.trezor.io/*',
      'https://testnet-rpc.plasma.to/*',
    ],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    },
    web_accessible_resources: [
      {
        resources: ['ethereum-provider.js'],
        matches: ['https://*/*'],
      },
    ],
    action: {
      default_title: 'WDK Wallet',
    },
  },
  vite: () => ({
    plugins: [
      tailwindcss(),
      nodePolyfills({
        exclude: ['crypto', 'vm'],
        include: ['buffer'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
    ],
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@buildonspark/spark-sdk':
          projectPath('./node_modules/@buildonspark/spark-sdk/dist/index.browser.js'),
        crypto: projectPath('./src/lib/node-crypto-browser.ts'),
        'ethers/lib.esm/crypto/crypto.js':
          projectPath('./node_modules/ethers/lib.esm/crypto/crypto-browser.js'),
        'ethers/lib.esm/providers/provider-ipcsocket.js':
          projectPath('./node_modules/ethers/lib.esm/providers/provider-ipcsocket-browser.js'),
        'ethers/lib.esm/providers/ws.js': projectPath(
          './node_modules/ethers/lib.esm/providers/ws-browser.js',
        ),
        'ethers/lib.esm/utils/base64.js':
          projectPath('./node_modules/ethers/lib.esm/utils/base64-browser.js'),
        'ethers/lib.esm/utils/geturl.js':
          projectPath('./node_modules/ethers/lib.esm/utils/geturl-browser.js'),
        'ethers/lib.esm/wordlists/wordlists.js':
          projectPath('./node_modules/ethers/lib.esm/wordlists/wordlists-browser.js'),
        'node:crypto': projectPath('./src/lib/node-crypto-browser.ts'),
        'sodium-universal': projectPath('./src/lib/sodium-universal-browser.ts'),
      },
    },
  }),
});
