import { test, expect } from '@playwright/test';

test('password-protected note', async ({ page, context }) => {
  await page.goto('/');
  await page.fill('#msg', 'secret with pw');
  await page.check('#pwToggle');
  await page.fill('#pw', 'correct-horse-battery-staple');
  await page.click('#send');
  await expect(page.locator('#link')).toHaveValue(/&s=/, { timeout: 30000 });
  const url = await page.locator('#link').inputValue();

  const tab2 = await context.newPage();
  await tab2.goto(url);
  await tab2.fill('#pw', 'wrong-password');
  await tab2.click('#show');
  await expect(tab2.locator('#status')).toContainText(/wrong/i, { timeout: 10000 });

  // correct
  await tab2.reload();
  await tab2.fill('#pw', 'correct-horse-battery-staple');
  await tab2.click('#show');
  await expect(tab2.locator('#content')).toContainText('secret with pw');
});
