import { getPOWChallenge } from '../api/client.js';

export async function solvePOW(onProgress) {
  const challenge = await getPOWChallenge();
  const cores = Math.max(1, Math.min(8, navigator.hardwareConcurrency || 2));
  const workers = Array.from({ length: cores }, () =>
    new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
  );
  let totalIter = 0;
  return new Promise((resolve, reject) => {
    let done = false;
    workers.forEach((worker, idx) => {
      worker.onmessage = (e) => {
        if (done) return;
        if (e.data.progress !== undefined) {
          totalIter += 1024;
          onProgress?.(totalIter);
          return;
        }
        if (e.data.error) {
          done = true;
          workers.forEach(w => w.terminate());
          reject(new Error(e.data.error));
          return;
        }
        done = true;
        workers.forEach(w => w.terminate());
        resolve({ seed: challenge.seed, nonce: e.data.nonce });
      };
      worker.postMessage({
        seed: challenge.seed,
        difficulty: challenge.difficulty,
        workerId: idx,
        workerCount: cores,
      });
    });
  });
}
