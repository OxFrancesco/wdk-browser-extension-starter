import { describe, expect, it } from 'vitest';

import { validateRecipientAddress } from './validation';

describe('recipient address validation', () => {
  it('accepts and rejects EVM addresses', () => {
    expect(validateRecipientAddress('ethereum', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'mainnet')).toBe(
      '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    );
    expect(() => validateRecipientAddress('polygon', 'not-an-address', 'mainnet')).toThrow('Polygon');
  });

  it('validates Bitcoin addresses against the active network mode', () => {
    expect(validateRecipientAddress('bitcoin', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'mainnet')).toBe(
      '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    );
    expect(validateRecipientAddress('bitcoin', 'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn', 'testnet')).toBe(
      'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn',
    );
    expect(() =>
      validateRecipientAddress('bitcoin', 'tb1qfmf4wycwm0dg8v2hj4g85l4pakzmvp7lu0q7ks', 'mainnet'),
    ).toThrow(
      'Bitcoin Mainnet',
    );
  });

  it('accepts Solana and Spark addresses', () => {
    expect(validateRecipientAddress('solana', '11111111111111111111111111111111', 'mainnet')).toBe(
      '11111111111111111111111111111111',
    );
    expect(validateRecipientAddress('spark', 'spark1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq', 'mainnet')).toBe(
      'spark1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    );
  });
});
