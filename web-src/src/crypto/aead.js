import sodium from 'libsodium-wrappers';

export async function ready() { await sodium.ready; }

export function randomKey() {
  return sodium.crypto_aead_xchacha20poly1305_ietf_keygen();
}

// Returns [nonce || ciphertext] as a single Uint8Array.
export function encrypt(key, plaintext) {
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ct = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, null, null, nonce, key);
  const out = new Uint8Array(nonce.length + ct.length);
  out.set(nonce, 0);
  out.set(ct, nonce.length);
  return out;
}

export function decrypt(key, combined) {
  const n = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  const nonce = combined.slice(0, n);
  const ct = combined.slice(n);
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ct, null, nonce, key);
}

export function toB64(u8) {
  return sodium.to_base64(u8, sodium.base64_variants.ORIGINAL);
}
export function fromB64(s) {
  return sodium.from_base64(s, sodium.base64_variants.ORIGINAL);
}

// URL-safe variants for the fragment.
export function toB64Url(u8) {
  return sodium.to_base64(u8, sodium.base64_variants.URLSAFE_NO_PADDING);
}
export function fromB64Url(s) {
  return sodium.from_base64(s, sodium.base64_variants.URLSAFE_NO_PADDING);
}
