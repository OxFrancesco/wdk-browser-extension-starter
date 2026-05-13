import { describe, expect, it } from 'vitest';

import type { VaultPlaintext } from './types';
import {
  createVaultKey,
  CURRENT_KDF_ITERATIONS,
  decryptVault,
  encryptVault,
  encryptVaultWithKey,
  MIN_NEW_PASSWORD_LENGTH,
} from './vault-crypto';

const vault: VaultPlaintext = {
  version: 1,
  activeWalletId: 'wallet-1',
  networkMode: 'mainnet',
  rpcPreferences: {},
  dappPermissions: {},
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
    expect(encrypted.kdf).toBe('PBKDF2-SHA256');
    expect(encrypted.iterations).toBe(CURRENT_KDF_ITERATIONS);
    expect(encrypted.ciphertext).not.toContain('abandon');
  });

  it('rejects the wrong password', async () => {
    const encrypted = await encryptVault(vault, 'correct horse battery staple');
    await expect(decryptVault(encrypted, 'incorrect password')).rejects.toThrow();
  });

  it('rejects weak new vault passwords', async () => {
    await expect(encryptVault(vault, 'too short')).rejects.toThrow(
      `at least ${MIN_NEW_PASSWORD_LENGTH} characters`,
    );
  });

  it('can re-encrypt existing legacy vaults without applying the new password policy', async () => {
    const legacyPassword = 'old vault!';
    const legacyKey = await createVaultKey(legacyPassword, {
      enforcePasswordPolicy: false,
      iterations: 250_000,
    });
    const upgradeKey = await createVaultKey(legacyPassword, {
      enforcePasswordPolicy: false,
    });
    const legacyEnvelope = await encryptVaultWithKey(vault, legacyKey);
    const upgradedEnvelope = await encryptVaultWithKey(vault, upgradeKey);

    expect(legacyEnvelope.iterations).toBe(250_000);
    expect(upgradedEnvelope.iterations).toBe(CURRENT_KDF_ITERATIONS);
    await expect(decryptVault(upgradedEnvelope, legacyPassword)).resolves.toEqual(vault);
  });

  it('decrypts legacy envelopes with their stored KDF settings', async () => {
    const legacyKey = await createVaultKey('correct horse battery staple', {
      iterations: 250_000,
    });
    const legacyEnvelope = await encryptVaultWithKey(vault, legacyKey);

    expect(legacyEnvelope.iterations).toBe(250_000);
    await expect(decryptVault(legacyEnvelope, 'correct horse battery staple')).resolves.toEqual(vault);
  });
});
