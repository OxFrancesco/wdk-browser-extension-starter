export function sodium_memzero(value: Uint8Array | undefined): void {
  value?.fill(0);
}
