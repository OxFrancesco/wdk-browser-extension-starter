import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'WDK Browser Wallet Starter',
    description:
      'Reference Chrome and Brave extension wallet built with WXT and Tether WDK.',
    permissions: ['storage', 'alarms', 'clipboardWrite'],
    host_permissions: ['https://*/*', 'http://*/*'],
    action: {
      default_title: 'WDK Wallet',
    },
  },
  vite: () => ({
    plugins: [
      tailwindcss(),
      nodePolyfills({
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
        'sodium-universal': '/src/lib/sodium-universal-browser.ts',
      },
    },
  }),
});
