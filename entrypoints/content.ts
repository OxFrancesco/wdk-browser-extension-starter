const ALLOWED_PAGE_MESSAGE = 'WDK_WALLET_REQUEST';
const EXTENSION_RESPONSE = 'WDK_WALLET_RESPONSE';
const ETHEREUM_REQUEST = 'WDK_ETHEREUM_REQUEST';
const ETHEREUM_RESPONSE = 'WDK_ETHEREUM_RESPONSE';

export default defineContentScript({
  matches: ['https://*/*'],
  main() {
    const providerScript = document.createElement('script');
    providerScript.src = browser.runtime.getURL('/ethereum-provider.js');
    providerScript.async = false;
    providerScript.onload = () => providerScript.remove();
    (document.head ?? document.documentElement).append(providerScript);

    window.addEventListener('message', async (event) => {
      if (event.source !== window || event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === ETHEREUM_REQUEST) {
        const { id, method, params } = event.data;
        const response = await browser.runtime.sendMessage({
          type: 'dapp:request',
          request: {
            origin: window.location.origin,
            method,
            params,
          },
        });

        window.postMessage(
          {
            type: ETHEREUM_RESPONSE,
            id,
            ok: response.ok,
            data: response.ok ? response.data : undefined,
            error: response.ok ? undefined : response.error,
          },
          window.location.origin,
        );
        return;
      }

      if (event.data?.type !== ALLOWED_PAGE_MESSAGE) {
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

      const response = await browser.runtime.sendMessage({ type: 'wallet:status' });

      window.postMessage(
        {
          type: EXTENSION_RESPONSE,
          id,
          ok: response.ok,
          data: response.ok ? response.data : undefined,
          error: response.ok ? undefined : response.error,
        },
        window.location.origin,
      );
    });
  },
});
