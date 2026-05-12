const ALLOWED_PAGE_MESSAGE = 'WDK_WALLET_REQUEST';
const EXTENSION_RESPONSE = 'WDK_WALLET_RESPONSE';

export default defineContentScript({
  matches: ['https://*/*'],
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
