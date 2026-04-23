import { killNote } from '../api/client.js';
import { t } from '../ui/i18n.js';
import { icons } from '../ui/icons.js';

export function renderSuccess(root, data) {
  const expiry = new Date(data.expiresAt * 1000).toLocaleString();
  root.innerHTML = `
    <section class="success">
      <h1 tabindex="-1">${t('success.title', 'Note ready')}</h1>
      <p class="lede">${t('success.lede', 'Share this link. It will be destroyed the moment it is opened.')}</p>

      <div class="link-display">
        <input id="link" type="text" readonly value="${escape(data.url)}" aria-label="${t('success.linkLabel', 'Share link')}">
        <button id="copy" type="button" class="btn-secondary">
          ${icons.copy()}<span>${t('success.copy', 'Copy')}</span>
        </button>
      </div>

      <div class="row" style="margin-top: var(--s-12);">
        <button id="share" type="button" class="btn-secondary sm">
          ${icons.share()}<span>${t('success.share', 'Share')}</span>
        </button>
      </div>

      <div class="meta">
        <span class="meta-item">${icons.clock()} ${t('success.expiry', 'Expires')} <strong>${expiry}</strong></span>
      </div>

      <details class="qr-wrapper">
        <summary>${icons.qr()} ${t('success.qr', 'Show QR code')}</summary>
        <div id="qr" class="qr"></div>
      </details>

      <hr>

      <h2>${t('success.kill.title', 'Destroy now')}</h2>
      <p>${t('success.kill.hint', 'If you change your mind, you can burn the note before it is read.')}</p>
      <button id="kill" type="button" class="danger">
        ${icons.trash()}<span>${t('success.kill.btn', 'Destroy this note')}</span>
      </button>
      <p id="killStatus" class="status" role="status" aria-live="polite"></p>
    </section>
  `;

  const copyBtn = root.querySelector('#copy');
  const killBtn = root.querySelector('#kill');
  const killStatus = root.querySelector('#killStatus');

  copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(data.url);
    copyBtn.innerHTML = `${icons.check()}<span>${t('success.copied', 'Copied')}</span>`;
    setTimeout(async () => {
      try { await navigator.clipboard.writeText(''); } catch {}
      copyBtn.innerHTML = `${icons.copy()}<span>${t('success.copy', 'Copy')}</span>`;
    }, 30_000);
  });

  killBtn.addEventListener('click', async () => {
    if (!confirm(t('success.kill.confirm', 'Destroy this note? This cannot be undone.'))) return;
    try {
      await killNote(data.id, data.kill);
      killStatus.className = 'status ok';
      killStatus.textContent = t('success.killed', 'Destroyed. The link is now inactive.');
      killBtn.disabled = true;
    } catch (e) {
      const { formatError } = await import('../ui/errors.js');
      killStatus.className = 'status error';
      killStatus.textContent = formatError(e);
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
