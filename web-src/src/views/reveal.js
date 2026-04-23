import { ready, decrypt, fromB64, fromB64Url } from '../crypto/aead.js';
import { revealNote } from '../api/client.js';
import { t } from '../ui/i18n.js';

export function renderReveal(root, id) {
  const frag = parseFragment(location.hash);
  root.innerHTML = `
    <section class="reveal">
      <h1>🔥 ${t('reveal.title', 'A note is waiting for you')}</h1>
      <p>${t('reveal.warn', 'Once you click “Show note”, it will be decrypted, shown once, and then destroyed forever.')}</p>
      <ul>
        <li>${t('reveal.tip1', 'Make sure you are ready to read it now')}</li>
        <li>${t('reveal.tip2', 'Make sure no one is looking over your shoulder')}</li>
      </ul>
      <button id="show" type="button">👁 ${t('reveal.show', 'Show note')}</button>
      <p id="status" class="status" role="status"></p>
      <div class="toolbar" id="revealToolbar" hidden><button id="maskReveal" type="button">👁 Hide</button></div>
      <div id="content" class="content" hidden></div>
    </section>
  `;
  const btn = root.querySelector('#show');
  const status = root.querySelector('#status');
  const content = root.querySelector('#content');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.textContent = '🔒 ' + t('reveal.decrypting', 'Decrypting…');
    try {
      const resp = await revealNote(id);
      await ready();
      const ct = fromB64(resp.ciphertext);
      const key = fromB64Url(frag.k);
      const pt = decrypt(key, ct);
      // Inject countdown UI above content
      const cd = document.createElement('div');
      cd.className = 'countdown';
      cd.innerHTML = `⏱ <span id="cd">1:00</span> <button id="extend" type="button">+60s</button>`;
      content.parentNode.insertBefore(cd, content);

      content.textContent = new TextDecoder().decode(pt);
      content.hidden = false;
      const toolbar = root.querySelector('#revealToolbar');
      toolbar.hidden = false;
      import('../ui/mask.js').then(m => m.attachMask(content, root.querySelector('#maskReveal')));

      let extended = false;
      const { startCountdown } = await import('../ui/countdown.js');
      const ctl = startCountdown(cd.querySelector('#cd'), 60, () => {
        content.textContent = '🔥 ' + t('reveal.expired', 'This note no longer exists.');
        cd.remove();
      });
      cd.querySelector('#extend').addEventListener('click', () => {
        if (extended) return;
        extended = true;
        ctl.extend(60);
        cd.querySelector('#extend').disabled = true;
      });

      status.textContent = '';
      btn.hidden = true;
    } catch (e) {
      if (e.status === 404) {
        status.textContent = '🔥 ' + t('reveal.gone', 'This note is already gone.');
      } else {
        status.textContent = '❌ ' + e.message;
      }
    }
  });
}

function parseFragment(hash) {
  const out = {};
  (hash.startsWith('#') ? hash.slice(1) : hash).split('&').forEach(p => {
    const [k, v] = p.split('=');
    if (k) out[k] = v || '';
  });
  return out;
}
