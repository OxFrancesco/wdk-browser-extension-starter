import { describe, expect, it } from 'vitest';

import type { VaultPlaintext } from './types';
import { decryptVault, encryptVault } from './vault-crypto';

const vault: VaultPlaintext = {
  version: 1,
  activeWalletId: 'wallet-1',
  networkMode: 'mainnet',
  sessionTimeoutMinutes: 15,
  wallets: [
    {
      id: 'wallet-1',
      name: 'Primary',
      seedPhrase: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      accountCount: 1,
      createdAt: 1,
    },
  ],
  transactions: [],
};

describe('vault encryption', () => {
  it('round-trips an encrypted vault with the correct password', async () => {
    const encrypted = await encryptVault(vault, 'correct horse battery staple');
    await expect(decryptVault(encrypted, 'correct horse battery staple')).resolves.toEqual(vault);
    expect(encrypted.ciphertext).not.toContain('abandon');
  });

  it('rejects the wrong password', async () => {
    const encrypted = await encryptVault(vault, 'correct horse battery staple');
    await expect(decryptVault(encrypted, 'incorrect password')).rejects.toThrow();
  });
});
