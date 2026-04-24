export function renderImprint(root) {
  root.innerHTML = `
    <section class="page legal">
      <h1 tabindex="-1">Imprint</h1>
      <p class="lede">Information according to § 5 TMG and § 18 MStV.</p>

      <h2>Operator</h2>
      <p>
        Kevin Felix<br>
        <!-- Please replace with your full postal address (street + number + ZIP + city). -->
        [Street + number]<br>
        [ZIP] [City]<br>
        Germany
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:admin@backsafe.de">admin@backsafe.de</a><br>
        <!-- Phone number is strongly recommended for "unmittelbare Kommunikation" per § 5 TMG. -->
        Phone: [+49 …]
      </p>

      <h2>Responsible for content (§ 18 Abs. 2 MStV)</h2>
      <p>Kevin Felix, address as above.</p>

      <h2>Disclaimer</h2>
      <p>
        This service is provided as-is with no warranty. It is an open-source
        project released under the MIT License; the source code is linked
        from the footer.
      </p>

      <h2>EU dispute resolution</h2>
      <p>
        The European Commission provides a platform for online dispute
        resolution (ODR): <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>.
        We are not obliged and not willing to participate in dispute
        resolution proceedings before a consumer arbitration board.
      </p>
    </section>
  `;
}
