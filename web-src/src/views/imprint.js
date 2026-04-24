export function renderImprint(root) {
  root.innerHTML = `
    <section class="page legal">
      <h1 tabindex="-1">Imprint</h1>
      <p class="lede">Information according to § 5 TMG.</p>

      <h2>Operator</h2>
      <p>
        Kevin Felix<br>
        Germany
      </p>

      <h2>Contact</h2>
      <p>Email: <a href="mailto:admin@backsafe.de">admin@backsafe.de</a></p>

      <h2>Responsible for content</h2>
      <p>Kevin Felix (address on request)</p>

      <h2>Disclaimer</h2>
      <p>This service is provided as-is with no warranty. It is an open-source project; the source code is available under the link in the footer.</p>
    </section>
  `;
}
