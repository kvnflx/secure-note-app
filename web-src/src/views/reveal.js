import { ready, decrypt, fromB64, fromB64Url } from '../crypto/aead.js';
import { deriveKey } from '../crypto/kdf.js';
import { revealNote } from '../api/client.js';
import { t } from '../ui/i18n.js';

export function renderReveal(root, id) {
  const frag = parseFragment(location.hash);
  const passwordSection = frag.s
    ? `<div class="row"><input id="pw" type="password" placeholder="${t('compose.pwPlaceholder', 'Password')}"></div>`
    : '';
  root.innerHTML = `
    <section class="reveal">
      <h1>🔥 ${t('reveal.title', 'A note is waiting for you')}</h1>
      <p>${t('reveal.warn', 'Once you click “Show note”, it will be decrypted, shown once, and then destroyed forever.')}</p>
      <ul>
        <li>${t('reveal.tip1', 'Make sure you are ready to read it now')}</li>
        <li>${t('reveal.tip2', 'Make sure no one is looking over your shoulder')}</li>
      </ul>
      ${passwordSection}
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
      await ready();
      let key;
      if (frag.s) {
        const pwInput = root.querySelector('#pw');
        const userPassword = pwInput ? pwInput.value : '';
        const salt = fromB64Url(frag.s);
        const wrap = deriveKey(userPassword, salt);
        try {
          key = decrypt(wrap, fromB64Url(frag.k));
        } catch {
          status.textContent = '❌ ' + t('reveal.wrongPassword', 'Wrong password.');
          btn.disabled = false;
          return;
        }
      } else {
        key = fromB64Url(frag.k);
      }

      const resp = await revealNote(id);
      const ct = fromB64(resp.ciphertext);
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

      // Copy button with auto-clear
      const copy = document.createElement('button');
      copy.textContent = '📋 Copy';
      copy.className = 'copy-plain';
      copy.addEventListener('click', async () => {
        await navigator.clipboard.writeText(content.textContent);
        copy.textContent = '✓ Copied (auto-clear 30s)';
        setTimeout(async () => {
          try { await navigator.clipboard.writeText(''); } catch {}
          copy.textContent = '📋 Copy';
        }, 30_000);
      });
      content.parentNode.appendChild(copy);
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
