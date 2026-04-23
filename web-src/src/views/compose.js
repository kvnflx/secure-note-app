import { ready, randomKey, encrypt, toB64, toB64Url } from '../crypto/aead.js';
import { solvePOW } from '../pow/client.js';
import { createNote } from '../api/client.js';
import { t } from '../ui/i18n.js';

export function renderCompose(root) {
  root.innerHTML = `
    <section class="compose">
      <header>
        <h1>🔥 burn.note</h1>
        <p class="tag">${t('compose.tag', 'one-time notes, zero metadata')}</p>
      </header>
      <textarea id="msg" rows="10" placeholder="${t('compose.placeholder', 'Write your message…')}" autocomplete="off" spellcheck="false"></textarea>
      <div class="row">
        <label>${t('compose.expiry', 'Expiry')}
          <select id="expiry">
            <option value="300">5 min</option>
            <option value="3600" selected>1 h</option>
            <option value="86400">1 d</option>
            <option value="604800">7 d</option>
            <option value="2592000">30 d</option>
          </select>
        </label>
      </div>
      <button id="send" type="button">${t('compose.submit', 'Create note')}</button>
      <p id="status" class="status" role="status"></p>
    </section>
  `;

  const ta = root.querySelector('#msg');
  const sel = root.querySelector('#expiry');
  const btn = root.querySelector('#send');
  const status = root.querySelector('#status');

  btn.addEventListener('click', () => submit(ta, sel, btn, status));
}

async function submit(ta, sel, btn, status) {
  const text = ta.value;
  if (!text) return;
  btn.disabled = true;
  status.textContent = '🔒 Encrypting…';
  try {
    await ready();
    const key = randomKey();
    const ct = encrypt(key, new TextEncoder().encode(text));
    status.textContent = '⛏ Solving proof-of-work…';
    const pow = await solvePOW();
    status.textContent = '📤 Submitting…';
    const resp = await createNote({
      ciphertext: toB64(ct),
      expires_in: parseInt(sel.value, 10),
      has_password: false,
      pow
    });
    const url = `${location.origin}/n/${resp.id}#k=${toB64Url(key)}`;
    history.pushState({ success: true, url, kill: resp.kill_token, expiresAt: resp.expires_at, id: resp.id }, '', '/success');
    const { renderSuccess } = await import('./success.js');
    renderSuccess(document.getElementById('app'), { url, kill: resp.kill_token, expiresAt: resp.expires_at, id: resp.id });
  } catch (e) {
    status.textContent = '❌ ' + e.message;
    btn.disabled = false;
  }
}
