import { test, expect } from '@playwright/test';

test('fragment is never sent to server in any request', async ({ page }) => {
  const requests = [];
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));

  await page.goto('/');
  await page.fill('#msg', 'frag leak check');
  await page.click('#send');
  await expect(page.locator('#link')).toHaveValue(/\/n\//, { timeout: 20000 });
  const url = await page.locator('#link').inputValue();

  await page.goto(url);
  await page.click('#show');

  for (const req of requests) {
    // Browsers strip fragments from URLs before sending them; these asserts
    // document that invariant. If any request carried '#' or 'k=' as a query
    // parameter it would mean the client mistakenly promoted the fragment
    // into the URL or body.
    expect(req.url).not.toContain('#');
    const u = new URL(req.url);
    expect(u.searchParams.has('k')).toBeFalsy();
  }
});

test('og-tags on /n/<id> are static across ids', async ({ request }) => {
  const a = await request.get('/n/ABCDEFGHIJKLMNOP');
  const b = await request.get('/n/ZZZZZZZZZZZZZZZZ');
  expect(a.status()).toBe(200);
  expect(b.status()).toBe(200);
  const htmlA = await a.text();
  const htmlB = await b.text();

  // Both shells must contain the generic OG tags.
  expect(htmlA).toMatch(/og:title/);
  expect(htmlA).toContain('Click to reveal');
  expect(htmlB).toMatch(/og:title/);
  expect(htmlB).toContain('Click to reveal');

  // IDs must not leak into the shell HTML — the shell is identical.
  expect(htmlA).not.toContain('ABCDEFGHIJKLMNOP');
  expect(htmlB).not.toContain('ZZZZZZZZZZZZZZZZ');

  // Bytes of both shells should be identical (true static asset).
  expect(htmlA).toBe(htmlB);
});
