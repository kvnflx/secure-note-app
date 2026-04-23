import { getPOWChallenge } from '../api/client.js';

export async function solvePOW(onProgress) {
  const challenge = await getPOWChallenge();
  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      if (e.data.progress !== undefined) { onProgress?.(e.data.progress); return; }
      if (e.data.error) { worker.terminate(); reject(new Error(e.data.error)); return; }
      worker.terminate();
      resolve({ seed: challenge.seed, nonce: e.data.nonce });
    };
    worker.postMessage({ seed: challenge.seed, difficulty: challenge.difficulty });
  });
}
