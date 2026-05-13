import { describe, expect, it } from 'vitest';

import {
  addRpcPreference,
  addCustomEvmChain,
  CHAINS,
  findEvmChainByHexId,
  formatBaseUnits,
  getChain,
  getChainList,
  getCustomRpcUrls,
  getEffectiveRpcUrls,
  getChains,
  normalizeAddEthereumChainParameter,
  normalizeCustomEvmChains,
  normalizeRpcPreferences,
  normalizeRpcUrl,
  parseBaseUnits,
  removeRpcPreference,
  rpcPermissionPattern,
} from './chains';

describe('chain configuration', () => {
  it('covers the networks and assets required by the bounty brief', () => {
    expect(Object.keys(getChains('mainnet'))).toEqual(
      expect.arrayContaining([
        'bitcoin',
        'spark',
        'ethereum',
        'polygon',
        'arbitrum',
        'plasma',
        'solana',
      ]),
    );

    const assetIds = new Set(
      Object.values(getChains('mainnet')).flatMap((chain) => chain.assets.map((asset) => asset.id)),
    );
    expect([...assetIds]).toEqual(expect.arrayContaining(['BTC', 'USDT', 'XAUT']));
  });

  it('has both mainnet and testnet definitions for each required network', () => {
    expect(Object.keys(CHAINS.mainnet).sort()).toEqual(Object.keys(CHAINS.testnet).sort());
    expect(CHAINS.mainnet.ethereum.chainId).toBe(1);
    expect(CHAINS.testnet.ethereum.chainId).toBe(11155111);
    expect(CHAINS.mainnet.plasma.chainId).toBe(9745);
    expect(CHAINS.testnet.plasma.chainId).toBe(9746);
    expect(CHAINS.testnet.bitcoin.bitcoinNetwork).toBe('testnet');
    expect(CHAINS.testnet.solana.networkLabel).toBe('Solana Devnet');
  });

  it('normalizes HTTPS custom RPC preferences before built-in fallbacks', () => {
    const preferences = addRpcPreference(
      undefined,
      'ethereum',
      'mainnet',
      'https://rpc.example.com/mainnet#ignored',
    );

    expect(getCustomRpcUrls(preferences, 'ethereum', 'mainnet')).toEqual([
      'https://rpc.example.com/mainnet',
    ]);
    expect(getEffectiveRpcUrls('ethereum', 'mainnet', preferences)[0]).toBe(
      'https://rpc.example.com/mainnet',
    );
    expect(removeRpcPreference(preferences, 'ethereum', 'mainnet', 'https://rpc.example.com/mainnet')).toEqual({});
  });

  it('rejects unsafe custom RPC URLs', () => {
    expect(() => normalizeRpcUrl('http://rpc.example.com')).toThrow('HTTPS');
    expect(() => normalizeRpcUrl('https://user:pass@rpc.example.com')).toThrow('credentials');
    expect(() => addRpcPreference(undefined, 'spark', 'mainnet', 'https://rpc.example.com')).toThrow(
      'configurable RPC',
    );
  });

  it('derives optional host permission patterns from RPC origins', () => {
    expect(rpcPermissionPattern('https://rpc.example.com/path?apiKey=test')).toBe(
      'https://rpc.example.com/*',
    );
    expect(normalizeRpcPreferences({ mainnet: { ethereum: ['not a url'] } })).toEqual({});
  });

  it('normalizes and registers custom EIP-155 chains per network mode', () => {
    const customChain = normalizeAddEthereumChainParameter(
      {
        chainId: '0x2105',
        chainName: 'Base',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://base.example.com/rpc'],
        blockExplorerUrls: ['https://basescan.org'],
      },
      'mainnet',
      1,
    );
    const customEvmChains = addCustomEvmChain(undefined, customChain);

    expect(getChain(customChain.id, 'mainnet', customEvmChains).chainId).toBe(8453);
    expect(getChainList('mainnet', customEvmChains).map((chain) => chain.id)).toContain(customChain.id);
    expect(findEvmChainByHexId('0x2105', customEvmChains)?.chainId).toBe(customChain.id);
    expect(getCustomRpcUrls(
      addRpcPreference(undefined, customChain.id, 'mainnet', 'https://base-alt.example.com', customEvmChains),
      customChain.id,
      'mainnet',
      customEvmChains,
    )).toEqual(['https://base-alt.example.com/']);
  });

  it('drops malformed custom EVM chain records', () => {
    expect(normalizeCustomEvmChains({
      mainnet: {
        'eip155:8453': {
          id: 'eip155:8453',
          chainId: 8453,
          label: 'Base',
          networkLabel: 'Base',
          networkMode: 'mainnet',
          rpcUrls: ['http://insecure.example.com'],
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          createdAt: 1,
          updatedAt: 1,
        },
      },
    })).toEqual({});
  });
});

describe('base unit conversion', () => {
  it('formats base units without losing integer precision', () => {
    expect(formatBaseUnits('123456789', 8)).toBe('1.23456789');
    expect(formatBaseUnits(1000000n, 6)).toBe('1');
  });

  it('parses decimal user input to base units', () => {
    expect(parseBaseUnits('1.25', 6)).toBe(1250000n);
    expect(() => parseBaseUnits('0', 6)).toThrow('greater than zero');
    expect(() => parseBaseUnits('1.123', 2)).toThrow('decimal places');
  });
});
