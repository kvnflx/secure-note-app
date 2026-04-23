import sodium from 'libsodium-wrappers-sumo';

export function randomSalt() {
  return sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
}

// 256-bit key via Argon2id with OWASP-2024-leaning params.
export function deriveKey(password, salt) {
  const opslimit = 3;                    // iterations
  const memlimit = 64 * 1024 * 1024;     // 64 MiB
  return sodium.crypto_pwhash(
    32,
    password,
    salt,
    opslimit,
    memlimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );
}
