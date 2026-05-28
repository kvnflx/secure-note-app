// Generates web-src/public/og-image.png (1200x630) used as og:image / twitter:image.
// Run with: node scripts/build-og-image.mjs   (cwd = web-src)
// Requires: playwright (already a devDependency via @playwright/test).

import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../public/og-image.png');

const html = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  :root {
    --bg: #0A0E17;
    --surface: #0F1420;
    --accent: #007AFF;
    --accent-glow: #4DA3FF;
    --fg: #F8FAFC;
    --fg-muted: #A1AABA;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1200px; height: 630px; }
  body {
    font-family: -apple-system, "Inter", "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--fg);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }
  /* Radial glow behind the logo */
  body::before {
    content: "";
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -55%);
    width: 900px; height: 900px;
    background: radial-gradient(circle, rgba(0,122,255,0.28) 0%, rgba(0,122,255,0.10) 35%, transparent 65%);
    filter: blur(20px);
    pointer-events: none;
  }
  /* Subtle grid texture */
  body::after {
    content: "";
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(0,122,255,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,122,255,0.05) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse at center, black 45%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 45%, transparent 75%);
    pointer-events: none;
  }
  main {
    position: relative;
    z-index: 1;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 36px;
    padding: 0 80px;
  }
  .logo {
    width: 160px;
    height: 160px;
    filter: drop-shadow(0 0 32px rgba(0,122,255,0.55));
  }
  h1 {
    font-size: 104px;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
    color: var(--fg);
  }
  p {
    font-size: 36px;
    font-weight: 500;
    color: var(--fg-muted);
    letter-spacing: -0.01em;
  }
  .domain {
    position: absolute;
    bottom: 48px;
    left: 0; right: 0;
    text-align: center;
    font-size: 22px;
    font-weight: 500;
    color: var(--accent);
    letter-spacing: 0.04em;
    text-transform: lowercase;
    z-index: 1;
  }
</style>
</head>
<body>
  <main>
    <svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <path
        d="M16 4.2 L25.3 7.6 C25.7 7.75 26 8.15 26 8.6 V15.5 C26 21.3 22.1 26.4 16.4 28.2 C16.14 28.28 15.86 28.28 15.6 28.2 C9.9 26.4 6 21.3 6 15.5 V8.6 C6 8.15 6.3 7.75 6.7 7.6 Z"
        fill="none" stroke="#007AFF" stroke-width="1.8" stroke-linejoin="round"/>
      <path
        d="M19.5 12.2 C18.7 11.3 17.4 10.8 16 10.8 C14.3 10.8 12.8 11.8 12.8 13.3 C12.8 14.6 14 15.3 15.6 15.7 L16.6 16 C18.2 16.4 19.5 17.1 19.5 18.5 C19.5 20.1 18 21 16.2 21 C14.6 21 13.2 20.4 12.3 19.5"
        fill="none" stroke="#007AFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <h1>Secure Note</h1>
    <p>Encrypted notes. Burn after reading.</p>
  </main>
  <div class="domain">note.backsafe.de</div>
</body>
</html>`;

async function ensureChromium() {
  try {
    // playwright-core does not ship browsers; install on demand.
    // Call the playwright CLI JS directly with Node to stay cross-platform
    // (avoids spawning .cmd shims that EINVAL on Windows).
    const cli = resolve(__dirname, '../node_modules/playwright-core/cli.js');
    execFileSync(process.execPath, [cli, 'install', 'chromium'], { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to install chromium:', e.message);
    throw e;
  }
}

async function main() {
  await ensureChromium();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const buf = await page.screenshot({ type: 'png', omitBackground: false });
  writeFileSync(outPath, buf);
  await browser.close();
  console.log(`wrote ${outPath} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
