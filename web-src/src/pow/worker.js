// PoW solver: find nonce such that SHA-256(seed || nonce) has >= difficulty leading zero bits.
async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return new Uint8Array(buf);
}

function leadingZeroBits(bytes) {
  let count = 0;
  for (const b of bytes) {
    if (b === 0) { count += 8; continue; }
    for (let m = 0x80; m; m >>= 1) {
      if ((b & m) === 0) count++;
      else return count;
    }
  }
  return count;
}

self.onmessage = async (e) => {
  const { seed, difficulty } = e.data;
  for (let i = 0; i < 1 << 30; i++) {
    const nonce = i.toString(36);
    const h = await sha256(seed + nonce);
    if (leadingZeroBits(h) >= difficulty) {
      self.postMessage({ nonce });
      return;
    }
    if ((i & 0x3ff) === 0) self.postMessage({ progress: i });
  }
  self.postMessage({ error: 'no nonce found' });
};
