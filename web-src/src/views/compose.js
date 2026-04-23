import { ready, randomKey, encrypt, toB64, toB64Url } from '../crypto/aead.js';
import { deriveKey, randomSalt } from '../crypto/kdf.js';
import { solvePOW } from '../pow/client.js';
import { createNote } from '../api/client.js';
import { t } from '../ui/i18n.js';

export function renderCompose(root) {
  root.innerHTML = `
    <section class="compose">
      <header>
        <h1 tabindex="-1">🔥 burn.note</h1>
        <p class="tag">${t('compose.tag', 'one-time notes, zero metadata')}</p>
      </header>
      <textarea id="msg" rows="10" placeholder="${t('compose.placeholder', 'Write your message…')}" autocomplete="off" spellcheck="false"></textarea>
      <div class="toolbar">
        <button id="mask" type="button" aria-label="Toggle masking">👁 Hide</button>
        <label class="codeModeLabel"><input type="checkbox" id="codeMode"> &lt;/&gt; Code mode</label>
      </div>
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
      <div class="row">
        <label><input type="checkbox" id="pwToggle"> ${t('compose.password', 'Additional password')}</label>
      </div>
      <div id="pwArea" hidden>
        <input type="password" id="pw" placeholder="${t('compose.pwPlaceholder', 'Password')}">
        <div id="pwBar" class="pwBar"></div>
      </div>
      <button id="send" type="button">${t('compose.submit', 'Create note')}</button>
      <p id="status" class="status" role="status" aria-live="polite"></p>
    </section>
  `;

  const ta = root.querySelector('#msg');
  const sel = root.querySelector('#expiry');
  const btn = root.querySelector('#send');
  const status = root.querySelector('#status');
  const pwToggle = root.querySelector('#pwToggle');
  const pwArea = root.querySelector('#pwArea');
  const pw = root.querySelector('#pw');
  const pwBar = root.querySelector('#pwBar');
  const codeMode = root.querySelector('#codeMode');

  pwToggle.addEventListener('change', () => {
    pwArea.hidden = !pwToggle.checked;
    if (!pwToggle.checked) pw.value = '';
    updateBar();
  });
  pw.addEventListener('input', updateBar);
  function updateBar() {
    import('../ui/strength.js').then(({ strength }) => {
      const s = strength(pw.value);
      pwBar.dataset.level = s.label;
      pwBar.textContent = `${s.label} (~${s.bits} bits)`;
    });
  }

  btn.addEventListener('click', () => submit(ta, sel, btn, status, pwToggle, pw, codeMode));
  import('../ui/mask.js').then(m => m.attachMask(ta, root.querySelector('#mask')));
}

async function submit(ta, sel, btn, status, pwToggle, pwInput, codeMode) {
  const text = ta.value;
  if (!text) return;
  const plaintext = codeMode?.checked ? '```\n' + text + '\n```' : text;
  btn.disabled = true;
  status.textContent = '🔒 Encrypting…';
  try {
    await ready();
    const payloadKey = randomKey();
    const ct = encrypt(payloadKey, new TextEncoder().encode(plaintext));

    let fragment = `#k=${toB64Url(payloadKey)}`;
    let hasPassword = false;
    if (pwToggle.checked && pwInput.value) {
      const salt = randomSalt();
      const wrap = deriveKey(pwInput.value, salt);
      const wrappedKey = encrypt(wrap, payloadKey);
      fragment = `#k=${toB64Url(wrappedKey)}&s=${toB64Url(salt)}`;
      hasPassword = true;
    }

    status.textContent = '⛏ Solving proof-of-work…';
    const pow = await solvePOW();
    status.textContent = '📤 Submitting…';
    const resp = await createNote({
      ciphertext: toB64(ct),
      expires_in: parseInt(sel.value, 10),
      has_password: hasPassword,
      pow
    });
    const url = `${location.origin}/n/${resp.id}${fragment}`;
    history.pushState({ success: true, url, kill: resp.kill_token, expiresAt: resp.expires_at, id: resp.id }, '', '/success');
    const { renderSuccess } = await import('./success.js');
    renderSuccess(document.getElementById('app'), { url, kill: resp.kill_token, expiresAt: resp.expires_at, id: resp.id });
  } catch (e) {
    const { formatError } = await import('../ui/errors.js');
    status.textContent = '❌ ' + formatError(e);
    btn.disabled = false;
  }
}
