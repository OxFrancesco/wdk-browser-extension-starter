import { describe, expect, it } from 'vitest';

import { CHAINS, formatBaseUnits, getChains, parseBaseUnits } from './chains';

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
