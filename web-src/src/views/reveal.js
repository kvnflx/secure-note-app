import { ready, decrypt, fromB64, fromB64Url } from '../crypto/aead.js';
import { deriveKey } from '../crypto/kdf.js';
import { revealNote } from '../api/client.js';
import { t } from '../ui/i18n.js';
import { icons } from '../ui/icons.js';

export function renderReveal(root, id) {
  const frag = parseFragment(location.hash);
  const passwordSection = frag.s
    ? `<div class="row" style="flex-direction: column; align-items: stretch;">
         <label for="pw">${t('reveal.pwLabel', 'Enter the password to continue')}</label>
         <input id="pw" type="password" placeholder="${t('compose.pwPlaceholder', 'Password')}" autocomplete="off">
       </div>`
    : '';

  root.innerHTML = `
    <section class="reveal">
      <h1 tabindex="-1">${t('reveal.title', 'A note is waiting for you')}</h1>
      <p class="lede">${t('reveal.lede', 'Reading this note will destroy it. You can only see it once.')}</p>

      <ul class="tips">
        <li>${t('reveal.tip1', 'Make sure you are ready to read it now')}</li>
        <li>${t('reveal.tip2', 'Make sure no one is looking over your shoulder')}</li>
      </ul>

      ${passwordSection}

      <div class="cta">
        <button id="show" type="button">
          <span>${t('reveal.show', 'Show note')}</span>
          ${icons.arrowRight()}
        </button>
      </div>
      <p id="status" class="status" role="status" aria-live="polite"></p>

      <div class="toolbar" id="revealToolbar" hidden>
        <button id="maskReveal" type="button" class="btn-secondary sm" aria-label="${t('compose.mask', 'Toggle visibility')}">
          ${icons.eyeOff()}<span class="label">${t('compose.mask.hide', 'Hide')}</span>
        </button>
      </div>
      <div id="content" class="content" hidden></div>
    </section>
  `;
  const btn = root.querySelector('#show');
  const status = root.querySelector('#status');
  const content = root.querySelector('#content');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.className = 'status';
    status.textContent = t('reveal.decrypting', 'Decrypting…');
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
          status.className = 'status error';
          status.textContent = t('reveal.wrongPassword', 'Wrong password.');
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
      cd.innerHTML = `
        <span class="cd-label">${icons.clock()}<span>${t('reveal.destroysIn', 'Destroys in')}</span></span>
        <span class="cd-value" id="cd">1:00</span>
        <button id="extend" type="button" class="btn-secondary sm">+60s</button>
      `;
      content.parentNode.insertBefore(cd, content);

      const decoded = new TextDecoder().decode(pt);
      const m = /^```(\w*)\n([\s\S]*)\n```$/.exec(decoded);
      if (m) {
        const lang = m[1] || 'plaintext';
        const code = m[2];
        try {
          const hljs = (await import('highlight.js/lib/core')).default;
          let result;
          try {
            const langMod = await import(/* @vite-ignore */ `highlight.js/lib/languages/${lang}`);
            hljs.registerLanguage(lang, langMod.default);
            result = hljs.highlight(code, { language: lang }).value;
          } catch {
            result = code.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
          }
          content.innerHTML = `<pre><code class="hljs language-${lang}">${result}</code></pre>`;
        } catch {
          content.textContent = decoded;
        }
      } else {
        content.textContent = decoded;
      }
      content.hidden = false;
      const toolbar = root.querySelector('#revealToolbar');
      toolbar.hidden = false;
      import('../ui/mask.js').then(m => m.attachMask(content, root.querySelector('#maskReveal')));

      let extended = false;
      const { startCountdown } = await import('../ui/countdown.js');
      const ctl = startCountdown(cd.querySelector('#cd'), 60, () => {
        content.classList.add('expired');
        content.textContent = t('reveal.expired', 'This note no longer exists.');
        cd.remove();
      });
      cd.querySelector('#extend').addEventListener('click', () => {
        if (extended) return;
        extended = true;
        ctl.extend(60);
        cd.querySelector('#extend').disabled = true;
      });

      // Copy-plain button, positioned after content
      const copy = document.createElement('button');
      copy.className = 'btn-secondary sm';
      copy.style.marginTop = 'var(--space-3)';
      copy.innerHTML = `${icons.copy()}<span>${t('success.copy', 'Copy')}</span>`;
      copy.addEventListener('click', async () => {
        await navigator.clipboard.writeText(content.textContent);
        copy.innerHTML = `${icons.check()}<span>${t('success.copied', 'Copied')}</span>`;
        setTimeout(async () => {
          try { await navigator.clipboard.writeText(''); } catch {}
          copy.innerHTML = `${icons.copy()}<span>${t('success.copy', 'Copy')}</span>`;
        }, 30_000);
      });
      content.parentNode.appendChild(copy);

      status.textContent = '';
      btn.parentNode.hidden = true;
    } catch (e) {
      if (e.status === 404) {
        status.className = 'status error';
        status.textContent = t('reveal.gone', 'This note is already gone.');
      } else {
        const { formatError } = await import('../ui/errors.js');
        status.className = 'status error';
        status.textContent = formatError(e);
      }
      btn.disabled = false;
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
