import { killNote } from '../api/client.js';
import { t } from '../ui/i18n.js';

export function renderSuccess(root, data) {
  const expiry = new Date(data.expiresAt * 1000).toLocaleString();
  root.innerHTML = `
    <section class="success">
      <h1 tabindex="-1">✓ ${t('success.title', 'Note created')}</h1>
      <p>${t('success.intro', 'Share this link:')}</p>
      <div class="row">
        <input id="link" type="text" readonly value="${escape(data.url)}">
        <button id="copy">${t('success.copy', 'Copy')}</button>
        <button id="share">📤 Share…</button>
      </div>
      <p class="status">${t('success.expiry', 'Expires at')} ${expiry}</p>
      <details class="qrDetails">
        <summary>📱 Show QR</summary>
        <div id="qr" class="qr"></div>
      </details>
      <hr>
      <h2>${t('success.kill.title', 'Kill switch')}</h2>
      <p>${t('success.kill.hint', 'You can destroy this note manually at any time:')}</p>
      <button id="kill" class="danger">⚠ ${t('success.kill.btn', 'Destroy now')}</button>
      <p id="killStatus" class="status" role="status" aria-live="polite"></p>
    </section>
  `;

  root.querySelector('#copy').addEventListener('click', async () => {
    await navigator.clipboard.writeText(data.url);
    const btn = root.querySelector('#copy');
    btn.textContent = '✓ ' + t('success.copied', 'Copied') + ' (auto-clear 30s)';
    setTimeout(async () => {
      try { await navigator.clipboard.writeText(''); } catch {}
      btn.textContent = t('success.copy', 'Copy');
    }, 30_000);
  });

  root.querySelector('#kill').addEventListener('click', async () => {
    if (!confirm(t('success.kill.confirm', 'Really destroy this note?'))) return;
    try {
      await killNote(data.id, data.kill);
      root.querySelector('#killStatus').textContent = '🔥 ' + t('success.killed', 'Destroyed.');
    } catch (e) {
      root.querySelector('#killStatus').textContent = '❌ ' + e.message;
    }
  });

  import('../ui/qr.js').then(m => {
    m.renderQR(root.querySelector('#qr'), data.url);
  });

  import('../ui/share.js').then(m => {
    root.querySelector('#share').addEventListener('click', () => m.shareOrCopy(data.url));
  });
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
