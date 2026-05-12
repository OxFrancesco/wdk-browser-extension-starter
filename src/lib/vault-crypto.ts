import type { VaultEnvelope, VaultPlaintext } from './types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 250_000;

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

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  if (password.length < 10) {
    throw new Error('Use a password with at least 10 characters.');
  }

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
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptVault(
  vault: VaultPlaintext,
  password: string,
): Promise<VaultEnvelope> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: asBufferSource(iv) },
    key,
    encoder.encode(JSON.stringify(vault)),
  );

  return {
    version: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    updatedAt: Date.now(),
  };
}

export async function decryptVault(
  envelope: VaultEnvelope,
  password: string,
): Promise<VaultPlaintext> {
  const key = await deriveKey(password, fromBase64(envelope.salt));
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: asBufferSource(fromBase64(envelope.iv)) },
    key,
    asBufferSource(fromBase64(envelope.ciphertext)),
  );

  return JSON.parse(decoder.decode(plaintext)) as VaultPlaintext;
}
