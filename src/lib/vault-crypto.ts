import type { VaultEnvelope, VaultPlaintext } from './types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const CURRENT_KDF_ITERATIONS = 600_000;
export const MIN_NEW_PASSWORD_LENGTH = 12;

export type VaultKey = {
  key: CryptoKey;
  salt: string;
  iterations: number;
  kdf: VaultEnvelope['kdf'];
};

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function asBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

async function deriveAesKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: asBufferSource(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function assertSupportedEnvelope(envelope: VaultEnvelope): void {
  if (envelope.version !== 1 || envelope.kdf !== 'PBKDF2-SHA256') {
    throw new Error('Unsupported vault format.');
  }

  if (!Number.isInteger(envelope.iterations) || envelope.iterations <= 0) {
    throw new Error('Invalid vault KDF settings.');
  }
}

function assertNewPassword(password: string): void {
  if (password.length < MIN_NEW_PASSWORD_LENGTH) {
    throw new Error(`Use a password with at least ${MIN_NEW_PASSWORD_LENGTH} characters.`);
  }
}

export async function createVaultKey(
  password: string,
  options: { iterations?: number; salt?: Uint8Array; enforcePasswordPolicy?: boolean } = {},
): Promise<VaultKey> {
  if (options.enforcePasswordPolicy ?? true) {
    assertNewPassword(password);
  }

  const iterations = options.iterations ?? CURRENT_KDF_ITERATIONS;
  const salt = options.salt ?? randomBytes(16);

  return {
    key: await deriveAesKey(password, salt, iterations),
    salt: toBase64(salt),
    iterations,
    kdf: 'PBKDF2-SHA256',
  };
}

async function deriveVaultKey(password: string, envelope: VaultEnvelope): Promise<VaultKey> {
  assertSupportedEnvelope(envelope);
  const salt = fromBase64(envelope.salt);

  return {
    key: await deriveAesKey(password, salt, envelope.iterations),
    salt: envelope.salt,
    iterations: envelope.iterations,
    kdf: envelope.kdf,
  };
}

export async function encryptVaultWithKey(
  vault: VaultPlaintext,
  vaultKey: VaultKey,
): Promise<VaultEnvelope> {
  const iv = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: asBufferSource(iv) },
    vaultKey.key,
    encoder.encode(JSON.stringify(vault)),
  );

  return {
    version: 1,
    kdf: vaultKey.kdf,
    iterations: vaultKey.iterations,
    salt: vaultKey.salt,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    updatedAt: Date.now(),
  };
}

export async function encryptVault(
  vault: VaultPlaintext,
  password: string,
): Promise<VaultEnvelope> {
  return encryptVaultWithKey(vault, await createVaultKey(password));
}

export async function decryptVault(
  envelope: VaultEnvelope,
  password: string,
): Promise<VaultPlaintext> {
  const vaultKey = await deriveVaultKey(password, envelope);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: asBufferSource(fromBase64(envelope.iv)) },
    vaultKey.key,
    asBufferSource(fromBase64(envelope.ciphertext)),
  );

  return JSON.parse(decoder.decode(plaintext)) as VaultPlaintext;
}

export async function openVault(
  envelope: VaultEnvelope,
  password: string,
): Promise<{ vault: VaultPlaintext; vaultKey: VaultKey }> {
  const vaultKey = await deriveVaultKey(password, envelope);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: asBufferSource(fromBase64(envelope.iv)) },
    vaultKey.key,
    asBufferSource(fromBase64(envelope.ciphertext)),
  );

  return {
    vault: JSON.parse(decoder.decode(plaintext)) as VaultPlaintext,
    vaultKey,
  };
}
