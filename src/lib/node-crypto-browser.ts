import { hmac } from '@noble/hashes/hmac';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { sha1 } from '@noble/hashes/sha1';
import { sha224, sha256, sha384, sha512 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';

type BinaryInput = string | ArrayBuffer | ArrayBufferView;
type HashFactory = typeof sha256;

const textEncoder = new TextEncoder();
const hashAlgorithms: Record<string, HashFactory> = {
  md160: ripemd160,
  rmd160: ripemd160,
  ripemd160,
  sha1,
  'sha-1': sha1,
  sha224,
  'sha-224': sha224,
  sha256,
  'sha-256': sha256,
  sha384,
  'sha-384': sha384,
  sha512,
  'sha-512': sha512,
};

function browserCrypto(): Crypto {
  if (!globalThis.crypto) {
    throw new Error('Web Crypto is required for browser crypto operations.');
  }

  return globalThis.crypto;
}

function toBytes(value: BinaryInput): Uint8Array {
  if (typeof value === 'string') return textEncoder.encode(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function getHashFactory(algorithm: string): HashFactory {
  const factory = hashAlgorithms[algorithm.toLowerCase()];
  if (!factory) {
    throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  }

  return factory;
}

export function createHash(algorithm: string) {
  const hash = getHashFactory(algorithm).create();

  return {
    update(value: BinaryInput) {
      hash.update(toBytes(value));
      return this;
    },
    digest(encoding?: 'hex') {
      const digest = hash.digest();
      return encoding === 'hex' ? bytesToHex(digest) : digest;
    },
  };
}

export function createHmac(algorithm: string, key: BinaryInput) {
  const mac = hmac.create(getHashFactory(algorithm), toBytes(key));

  return {
    update(value: BinaryInput) {
      mac.update(toBytes(value));
      return this;
    },
    digest(encoding?: 'hex') {
      const digest = mac.digest();
      return encoding === 'hex' ? bytesToHex(digest) : digest;
    },
  };
}

export function pbkdf2Sync(
  password: BinaryInput,
  salt: BinaryInput,
  iterations: number,
  keylen: number,
  algorithm: string,
): Uint8Array {
  return pbkdf2(getHashFactory(algorithm), toBytes(password), toBytes(salt), {
    c: iterations,
    dkLen: keylen,
  });
}

export function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
  if (!array) return array;
  browserCrypto().getRandomValues(array);
  return array;
}

export function randomFillSync<T extends ArrayBufferView>(buffer: T): T {
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  for (let offset = 0; offset < bytes.length; offset += 65_536) {
    browserCrypto().getRandomValues(bytes.subarray(offset, offset + 65_536));
  }
  return buffer;
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  randomFillSync(bytes);
  return bytes;
}

export const webcrypto = globalThis.crypto;
export const subtle = globalThis.crypto?.subtle;

const cryptoShim = {
  createHash,
  createHmac,
  getRandomValues,
  pbkdf2Sync,
  randomBytes,
  randomFillSync,
  subtle,
  webcrypto,
};

export default cryptoShim;
