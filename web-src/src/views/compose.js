import { ready, randomKey, encrypt, toB64, toB64Url } from '../crypto/aead.js';
import { deriveKey, randomSalt } from '../crypto/kdf.js';
import { solvePOW } from '../pow/client.js';
import { createNote } from '../api/client.js';
import { t } from '../ui/i18n.js';
import { icons } from '../ui/icons.js';

export function renderCompose(root) {
  root.innerHTML = `
    <section class="compose">
      <h1 tabindex="-1">${t('compose.title', 'Secure Note')}</h1>
      <p class="lede">${t('compose.lede', 'Write an encrypted note. It destroys itself the moment it is read.')}</p>

      <label for="msg" class="sr-only">Message</label>
      <textarea
        id="msg"
        rows="10"
        placeholder="${t('compose.placeholder', 'Type your message here. It never reaches the server in plain text.')}"
        autocomplete="off"
        spellcheck="false"
      ></textarea>

      <div class="toolbar">
        <button id="mask" type="button" class="ghost sm" aria-label="${t('compose.mask', 'Toggle visibility')}">
          ${icons.eyeOff()}<span class="label">${t('compose.mask.hide', 'Hide')}</span>
        </button>
        <label class="checkbox-wrap"><input type="checkbox" id="codeMode"> ${t('compose.codeMode', 'Code mode')}</label>
      </div>

      <div class="options">
        <div class="options-header">${t('compose.options', 'Options')}</div>

        <div class="options-row">
          <label for="expiry">${t('compose.expiry', 'Expires after')}</label>
          <select id="expiry">
            <option value="300">5 minutes</option>
            <option value="3600" selected>1 hour</option>
            <option value="86400">1 day</option>
            <option value="604800">7 days</option>
            <option value="2592000">30 days</option>
          </select>
        </div>

        <div class="options-row">
          <label for="pwToggle" class="checkbox-wrap">
            <input type="checkbox" id="pwToggle">
            ${t('compose.password', 'Require password')}
          </label>
        </div>
        <div id="pwArea" class="options-sub" hidden>
          <input type="password" id="pw" placeholder="${t('compose.pwPlaceholder', 'Password')}" autocomplete="new-password">
          <div id="pwBar" class="pw-strength" data-level="empty">
            <div class="bar" aria-hidden="true"></div>
            <span class="pw-label">&nbsp;</span>
          </div>
        </div>
      </div>

      <div class="cta">
        <button id="send" type="button">${t('compose.submit', 'Create note')}</button>
      </div>
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
      const labelEl = pwBar.querySelector('.pw-label');
      if (!pw.value) {
        labelEl.textContent = '';
      } else {
        const labels = {
          weak: t('strength.weak', 'Weak'),
          ok: t('strength.ok', 'Acceptable'),
          strong: t('strength.strong', 'Strong'),
          too_common: t('strength.too_common', 'Too common'),
        };
        labelEl.textContent = `${labels[s.label] || s.label} · ~${s.bits} bits`;
      }
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
  status.className = 'status';
  status.textContent = t('compose.encrypting', 'Encrypting…');
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

    status.textContent = t('compose.pow', 'Computing proof of work…');
    const powStart = performance.now();
    const pow = await solvePOW((iter) => {
      const elapsed = ((performance.now() - powStart) / 1000).toFixed(1);
      const rate = Math.round(iter / Math.max(0.1, (performance.now() - powStart) / 1000) / 1000);
      status.textContent = `${t('compose.pow', 'Computing proof of work…')} ${elapsed}s · ~${rate}k H/s`;
    });
    status.textContent = t('compose.submitting', 'Submitting…');
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
    status.className = 'status error';
    status.textContent = formatError(e);
    btn.disabled = false;
  }
}
