import { renderCompose } from './views/compose.js';
import { renderReveal } from './views/reveal.js';
import { renderUseCases } from './views/usecases.js';
import { renderHowItWorks } from './views/howitworks.js';
import { renderImprint } from './views/imprint.js';
import { renderPrivacy } from './views/privacy.js';
import { renderLicense } from './views/license.js';
import { initTheme } from './ui/theme.js';
import { initShortcuts } from './ui/shortcuts.js';
import { initI18n } from './ui/i18n.js';

async function boot() {
  await initI18n();
  initTheme();
  initShortcuts();
  initSPALinks();
  route();
  window.addEventListener('popstate', route);
}

function route() {
  const p = location.pathname;
  const mount = document.getElementById('app');
  mount.scrollTop = 0;
  window.scrollTo(0, 0);

  if (p.startsWith('/n/')) {
    const id = p.slice(3);
    renderReveal(mount, id);
  } else if (p === '/use-cases') {
    renderUseCases(mount);
  } else if (p === '/how-it-works') {
    renderHowItWorks(mount);
  } else if (p === '/imprint') {
    renderImprint(mount);
  } else if (p === '/privacy') {
    renderPrivacy(mount);
  } else if (p === '/license') {
    renderLicense(mount);
  } else {
    renderCompose(mount);
  }
  updateActiveNav();
  setTimeout(() => document.querySelector('#app h1')?.focus({ preventScroll: false }), 0);
}

function updateActiveNav() {
  const p = location.pathname;
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('is-active', a.getAttribute('href') === p);
  });
}

function initSPALinks() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-link]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#')) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    if (location.pathname !== href) {
      history.pushState({}, '', href);
      route();
    }
  });
}

boot();

// Do not register a service worker. The previous /sw.js cached "/" and
// pinned visitors to stale HTML. The kill-switch /sw.js on the server
// already unregisters the previously-installed worker on next visit.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(regs => regs.forEach(r => r.unregister().catch(() => {})))
    .catch(() => {});
}
