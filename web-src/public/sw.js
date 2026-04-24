// Kill-switch. Previous versions cached "/" which pinned visitors to
// stale HTML referencing asset hashes that no longer exist. The service
// worker now actively unregisters itself and wipes every cache on the
// next page load, so visitors recover automatically.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
    const clientsList = await self.clients.matchAll({ type: 'window' });
    for (const c of clientsList) {
      try { c.navigate(c.url); } catch {}
    }
    await self.registration.unregister();
  })());
});

self.addEventListener('fetch', (e) => {
  // Network-only. Never serve from cache.
  e.respondWith(fetch(e.request));
});
