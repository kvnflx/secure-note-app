export function renderPrivacy(root) {
  root.innerHTML = `
    <section class="page legal">
      <h1 tabindex="-1">Privacy</h1>
      <p class="lede">Secure Note is built so that no readable content ever reaches the server.</p>

      <h2>What we cannot see</h2>
      <p>
        The note is encrypted on your device before it is sent. The encryption key lives in the URL fragment after <code>#</code>, which browsers never send over the network. The server only ever receives ciphertext.
      </p>

      <h2>What we keep</h2>
      <p>
        Only the encrypted payload, until it is read or its expiry is reached — whichever comes first. No accounts, no email, no IP logs beyond what the hosting provider records at the network layer for abuse prevention.
      </p>

      <h2>Cookies and tracking</h2>
      <p>No cookies. No analytics. No third-party scripts.</p>

      <h2>Your rights (GDPR)</h2>
      <p>
        Because we do not collect personal data, there is nothing to export, correct, or delete on request. Any hosting-level network logs are kept for a short period for operational reasons and destroyed automatically.
      </p>

      <h2>Contact</h2>
      <p><a href="mailto:admin@backsafe.de">admin@backsafe.de</a></p>
    </section>
  `;
}
