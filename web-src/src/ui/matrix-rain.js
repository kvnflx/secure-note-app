// Matrix-rain background. Mirrors SwiftVault's MatrixRain component so
// note.backsafe.de and send.backsafe.de share the same atmosphere.
//
// Active only in dark mode and only when the user has not requested
// reduced motion. Listens for theme changes (data-theme attribute on
// <html>) and starts/stops the animation accordingly.

const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' +
  'アイウエオカキクケコサシスセソタチツテト' +
  '<>{}[]|/\\=+*&^%$#@!';
const FONT_SIZE = 14;
const FRAME_MS = 70;

let canvas = null;
let ctx = null;
let drops = [];
let columns = 0;
let intervalId = null;
let resizeHandler = null;
let themeObserver = null;

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isDark = () => document.documentElement.dataset.theme === 'dark';

function ensureCanvas() {
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.className = 'matrix-rain';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);
  ctx = canvas.getContext('2d');
  return canvas;
}

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const next = Math.floor(canvas.width / FONT_SIZE);
  const prev = drops;
  drops = new Array(next);
  for (let i = 0; i < next; i++) {
    drops[i] = prev[i] ?? Math.random() * -100;
  }
  columns = next;
}

function draw() {
  if (!ctx || !canvas) return;
  ctx.fillStyle = 'rgba(10, 14, 23, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${FONT_SIZE}px "JetBrains Mono", monospace`;

  for (let i = 0; i < columns; i++) {
    const char = CHARS[Math.floor(Math.random() * CHARS.length)];
    const x = i * FONT_SIZE;
    const y = drops[i] * FONT_SIZE;

    const brightness = 0.06 + Math.random() * 0.12;
    ctx.fillStyle = `rgba(0, 122, 255, ${brightness})`;
    ctx.fillText(char, x, y);

    if (Math.random() > 0.96) {
      ctx.fillStyle = 'rgba(0, 122, 255, 0.55)';
      ctx.fillText(char, x, y);
      if (Math.random() > 0.5) {
        ctx.fillStyle = 'rgba(77, 163, 255, 0.35)';
        ctx.fillText(char, x, y);
      }
    }

    if (y > canvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i] += 0.4 + Math.random() * 0.2;
  }
}

function start() {
  if (intervalId) return;
  if (reducedMotion()) return;
  ensureCanvas();
  // Randomise starting offsets so columns don't all begin in lock-step.
  resize();
  for (let i = 0; i < drops.length; i++) drops[i] = Math.random() * -50;
  resizeHandler = () => resize();
  window.addEventListener('resize', resizeHandler);
  intervalId = window.setInterval(draw, FRAME_MS);
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  if (canvas) {
    canvas.remove();
    canvas = null;
    ctx = null;
    drops = [];
    columns = 0;
  }
}

function sync() {
  if (isDark() && !reducedMotion()) start();
  else stop();
}

export function initMatrixRain() {
  sync();
  // React to theme toggle.
  if (themeObserver) return;
  themeObserver = new MutationObserver(sync);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  // React to reduced-motion preference change.
  window
    .matchMedia('(prefers-reduced-motion: reduce)')
    .addEventListener('change', sync);
}
