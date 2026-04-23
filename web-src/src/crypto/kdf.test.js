import { describe, it, expect, beforeAll } from 'vitest';
import { ready } from './aead.js';
import { deriveKey, randomSalt } from './kdf.js';

beforeAll(async () => { await ready(); });

describe('Argon2id KDF', () => {
  it('derives same key for same inputs', async () => {
    const salt = randomSalt();
    const k1 = deriveKey('hunter2', salt);
    const k2 = deriveKey('hunter2', salt);
    expect(k1).toEqual(k2);
  });

  it('different password produces different key', async () => {
    const salt = randomSalt();
    const k1 = deriveKey('a', salt);
    const k2 = deriveKey('b', salt);
    expect(k1).not.toEqual(k2);
  });

  it('salt is 16 bytes', async () => {
    expect(randomSalt().length).toBe(16);
  });
});
