import { icons } from '../ui/icons.js';

export function renderHowItWorks(root) {
  root.innerHTML = `
    <section class="page">
      <h1 tabindex="-1">How it works</h1>
      <p class="lede">Three steps. Your content is encrypted on your device, the link is the key, and the note destroys itself on read.</p>

      <ol class="steps">
        <li class="step">
          <span class="step-num">1</span>
          <div>
            <h3>Write your note</h3>
            <p>Type your message. It is encrypted in your browser before anything is transmitted. The encryption key lives only in the link you are about to create.</p>
          </div>
        </li>
        <li class="step">
          <span class="step-num">2</span>
          <div>
            <h3>Share the link</h3>
            <p>Copy the generated link and send it to the recipient through any channel — chat, email, SMS, QR. The key sits in the fragment after <code>#</code>, which is never sent over the network.</p>
          </div>
        </li>
        <li class="step">
          <span class="step-num">3</span>
          <div>
            <h3>One read, then gone</h3>
            <p>The recipient opens the link and sees the note exactly once. The ciphertext is destroyed the instant it is decrypted. A reload shows an empty page — the note no longer exists anywhere.</p>
          </div>
        </li>
      </ol>

      <h2>Controls on the compose page</h2>
      <dl class="controls-list">
        <div>
          <dt>${icons.eyeOff()} Hide</dt>
          <dd>Masks the text field so a bystander cannot read what you are typing.</dd>
        </div>
        <div>
          <dt>Code mode</dt>
          <dd>Wraps the note in a code block. The recipient sees syntax-highlighted code instead of plain text.</dd>
        </div>
        <div>
          <dt>${icons.clock()} Expires after</dt>
          <dd>Sets a maximum lifetime for the note. If nobody opens it within that time, it is destroyed automatically.</dd>
        </div>
        <div>
          <dt>${icons.shield()} Require password</dt>
          <dd>Adds a second factor. The recipient must know the password in addition to having the link. Brute-force protection is built in.</dd>
        </div>
      </dl>

      <h2>Controls after you create a note</h2>
      <dl class="controls-list">
        <div>
          <dt>${icons.copy()} Copy</dt>
          <dd>Copies the one-time link to the clipboard. The clipboard is cleared automatically after 30 seconds.</dd>
        </div>
        <div>
          <dt>${icons.share()} Share</dt>
          <dd>Opens the native share sheet on mobile, or copies the link on desktop.</dd>
        </div>
        <div>
          <dt>${icons.qr()} Show QR code</dt>
          <dd>Displays a QR code for the link so the recipient can scan it with their phone without typing.</dd>
        </div>
        <div>
          <dt>${icons.trash()} Destroy this note</dt>
          <dd>Burns the note immediately, before anyone reads it. The link stops working from that moment on.</dd>
        </div>
      </dl>

      <h2>Controls on the reveal page</h2>
      <dl class="controls-list">
        <div>
          <dt>Show note</dt>
          <dd>Decrypts and displays the note. From that moment, the note is gone — make sure you are ready.</dd>
        </div>
        <div>
          <dt>+60s</dt>
          <dd>Extends the on-screen countdown by one minute. The note is still destroyed on the server; this only changes how long your screen keeps it visible.</dd>
        </div>
        <div>
          <dt>${icons.copy()} Copy</dt>
          <dd>Copies the decrypted content. Clipboard is cleared after 30 seconds.</dd>
        </div>
      </dl>

      <div class="cta">
        <a href="/" class="btn-primary" data-link>
          <span>Create a note</span>
          ${icons.arrowRight()}
        </a>
      </div>
    </section>
  `;
}
