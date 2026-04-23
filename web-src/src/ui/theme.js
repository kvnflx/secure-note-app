const KEY = 'bn-theme';

export function initTheme() {
  apply(get());
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.addEventListener('click', () => { set(next(get())); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (get() === 'auto') apply('auto');
  });
}

function get() { return localStorage.getItem(KEY) || 'auto'; }
function set(v) { localStorage.setItem(KEY, v); apply(v); }
function next(v) { return v === 'auto' ? 'light' : v === 'light' ? 'dark' : 'auto'; }

function apply(mode) {
  const dark = mode === 'dark' || (mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = mode === 'dark' ? '🌙' : mode === 'light' ? '☀' : '🌓';
}
