import { renderCompose } from './views/compose.js';
import { renderReveal } from './views/reveal.js';
import { initTheme } from './ui/theme.js';
import { initShortcuts } from './ui/shortcuts.js';
import { initI18n } from './ui/i18n.js';

async function boot() {
  await initI18n();
  initTheme();
  initShortcuts();
  route();
  window.addEventListener('popstate', route);
}

function route() {
  const p = location.pathname;
  const mount = document.getElementById('app');
  if (p.startsWith('/n/')) {
    const id = p.slice(3);
    renderReveal(mount, id);
  } else {
    renderCompose(mount);
  }
  setTimeout(() => document.querySelector('#app h1')?.focus({ preventScroll: false }), 0);
}

boot();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
