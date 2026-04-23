import { describe, it, expect, beforeAll } from 'vitest';
import { ready, randomKey, encrypt, decrypt, toB64, fromB64 } from './aead.js';

beforeAll(async () => { await ready(); });

describe('AEAD XChaCha20-Poly1305', () => {
  it('round-trips plaintext', async () => {
    const key = randomKey();
    const pt = new TextEncoder().encode('secret message');
    const ct = encrypt(key, pt);
    const back = decrypt(key, ct);
    expect(new TextDecoder().decode(back)).toBe('secret message');
  });

  it('fails on tampered ciphertext', async () => {
    const key = randomKey();
    const ct = encrypt(key, new TextEncoder().encode('x'));
    ct[ct.length - 1] ^= 0xff;
    expect(() => decrypt(key, ct)).toThrow();
  });

  it('base64 round-trip', async () => {
    const b = new Uint8Array([1, 2, 3, 255]);
    expect(fromB64(toB64(b))).toEqual(b);
  });
});
