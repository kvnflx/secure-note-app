import { test, expect } from '@playwright/test';

test('reveal URL for non-existent id shows gone', async ({ page }) => {
  await page.goto('/n/NONEXISTENTID12#k=AAAA');
  await page.click('#show');
  await expect(page.locator('#status')).toContainText(/gone|already|nicht mehr/i);
});
