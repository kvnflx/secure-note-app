export function renderLicense(root) {
  root.innerHTML = `
    <section class="page legal">
      <h1 tabindex="-1">License</h1>
      <p class="lede">Secure Note is open-source software released under the MIT License.</p>

      <h2>MIT License</h2>
      <pre class="license-text">Copyright (c) 2026 Kevin Felix

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.</pre>

      <h2>What this means for you</h2>
      <p>
        You are free to use, modify, and redistribute Secure Note for any
        purpose — personal, commercial, or otherwise — provided the copyright
        notice and license text above are preserved in copies and derivative
        works.
      </p>
    </section>
  `;
}
