(() => {
  if (window.ethereum?.isWDKWallet) return;

  const REQUEST_TYPE = 'WDK_ETHEREUM_REQUEST';
  const RESPONSE_TYPE = 'WDK_ETHEREUM_RESPONSE';
  const listeners = new Map();
  const pending = new Map();

  function emit(event, value) {
    for (const listener of listeners.get(event) ?? []) {
      try {
        listener(value);
      } catch {
        // Match browser wallet behavior: listener errors must not break provider state.
      }
    }
  }

  function makeProviderError(message, code = 4001) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function request(args) {
    if (!args || typeof args.method !== 'string') {
      return Promise.reject(makeProviderError('Ethereum provider method is required.', -32600));
    }

    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(makeProviderError('Ethereum provider request timed out.', -32000));
      }, 120000);
      pending.set(id, { resolve, reject, method: args.method, timeout });
      window.postMessage(
        {
          type: REQUEST_TYPE,
          id,
          method: args.method,
          params: args.params,
        },
        window.location.origin,
      );
    });
  }

  const provider = {
    isMetaMask: true,
    isWDKWallet: true,
    selectedAddress: null,
    chainId: null,
    networkVersion: null,
    request,
    enable() {
      return request({ method: 'eth_requestAccounts' });
    },
    send(methodOrPayload, paramsOrCallback) {
      if (typeof methodOrPayload === 'string') {
        return request({ method: methodOrPayload, params: paramsOrCallback });
      }

      const payload = methodOrPayload ?? {};
      const callback = typeof paramsOrCallback === 'function' ? paramsOrCallback : undefined;
      const promise = request({ method: payload.method, params: payload.params });

      if (callback) {
        promise
          .then((result) => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
          .catch((error) => callback(error, null));
      }

      return promise;
    },
    sendAsync(payload, callback) {
      request({ method: payload?.method, params: payload?.params })
        .then((result) => callback(null, { id: payload?.id, jsonrpc: '2.0', result }))
        .catch((error) => callback(error, null));
    },
    on(event, listener) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(listener);
      return provider;
    },
    removeListener(event, listener) {
      listeners.get(event)?.delete(listener);
      return provider;
    },
  };

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== window.location.origin || event.data?.type !== RESPONSE_TYPE) {
      return;
    }

    const entry = pending.get(event.data.id);
    if (!entry) return;
    pending.delete(event.data.id);
    clearTimeout(entry.timeout);

    if (!event.data.ok) {
      entry.reject(makeProviderError(event.data.error || 'Ethereum provider request failed.'));
      return;
    }

    if (entry.method === 'eth_requestAccounts' || entry.method === 'eth_accounts') {
      provider.selectedAddress = Array.isArray(event.data.data) ? event.data.data[0] ?? null : null;
      emit('accountsChanged', provider.selectedAddress ? [provider.selectedAddress] : []);
    }

    if (entry.method === 'eth_chainId' || entry.method === 'wallet_switchEthereumChain') {
      const refresh = entry.method === 'eth_chainId'
        ? Promise.resolve(event.data.data)
        : request({ method: 'eth_chainId' });
      refresh.then((chainId) => {
        provider.chainId = chainId;
        provider.networkVersion = chainId ? String(Number.parseInt(chainId, 16)) : null;
        emit('chainChanged', chainId);
      });
    }

    entry.resolve(event.data.data);
  });

  const installedAsWindowEthereum = !window.ethereum;
  if (installedAsWindowEthereum) {
    Object.defineProperty(window, 'ethereum', {
      configurable: true,
      enumerable: false,
      value: provider,
      writable: false,
    });
  }

  function announceProvider() {
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: {
            uuid: '0b4b3fb4-9ce8-4a4f-969a-6f5a7f2c8b11',
            name: 'WDK Wallet',
            icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E',
            rdns: 'dev.wdk.wallet',
          },
          provider,
        },
      }),
    );
  }

  window.addEventListener('eip6963:requestProvider', announceProvider);
  if (installedAsWindowEthereum) {
    window.dispatchEvent(new Event('ethereum#initialized'));
  }
  announceProvider();
})();
