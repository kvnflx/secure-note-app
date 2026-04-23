import { renderCompose } from './views/compose.js';
import { renderReveal } from './views/reveal.js';
import { initTheme } from './ui/theme.js';
import { initI18n } from './ui/i18n.js';

async function boot() {
  await initI18n();
  initTheme();
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
}

boot();
