const ALLOWED_PAGE_MESSAGE = 'WDK_WALLET_REQUEST';
const EXTENSION_RESPONSE = 'WDK_WALLET_RESPONSE';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  main() {
    window.addEventListener('message', async (event) => {
      if (event.source !== window || event.data?.type !== ALLOWED_PAGE_MESSAGE) {
        return;
      }

      const { id, method } = event.data;

      if (method !== 'wallet:status') {
        window.postMessage(
          {
            type: EXTENSION_RESPONSE,
            id,
            ok: false,
            error: 'Unsupported wallet bridge method.',
          },
          window.location.origin,
        );
        return;
      }

      const response = await browser.runtime.sendMessage({ type: 'vault:get' });

      window.postMessage(
        {
          type: EXTENSION_RESPONSE,
          id,
          ok: response.ok,
          data: response.ok
            ? {
                locked: response.data.locked,
                hasVault: response.data.hasVault,
                accounts: response.data.locked ? [] : response.data.accounts,
              }
            : undefined,
          error: response.ok ? undefined : response.error,
        },
        window.location.origin,
      );
    });
  },
});
