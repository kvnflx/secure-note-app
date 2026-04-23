import { test, expect } from '@playwright/test';

test('create and reveal a note', async ({ page, context }) => {
  await page.goto('/');
  await page.fill('#msg', 'hello burn');
  await page.click('#send');
  await expect(page.locator('#link')).toHaveValue(/\/n\//, { timeout: 20000 });
  const url = await page.locator('#link').inputValue();

  const tab2 = await context.newPage();
  await tab2.goto(url);
  await tab2.click('#show');
  await expect(tab2.locator('#content')).toContainText('hello burn', { timeout: 15000 });

  // Reload → gone
  await tab2.reload();
  await tab2.click('#show');
  await expect(tab2.locator('#status')).toContainText(/gone|already/i);
});
