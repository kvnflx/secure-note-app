import { test, expect } from '@playwright/test';

test('kill switch destroys the note', async ({ page, context }) => {
  await page.goto('/');
  await page.fill('#msg', 'doomed');
  await page.click('#send');
  await expect(page.locator('#link')).toHaveValue(/\/n\//, { timeout: 20000 });
  const url = await page.locator('#link').inputValue();

  page.once('dialog', d => d.accept());
  await page.click('#kill');
  await expect(page.locator('#killStatus')).toContainText(/destroyed|zerstört/i);

  const tab2 = await context.newPage();
  await tab2.goto(url);
  await tab2.click('#show');
  await expect(tab2.locator('#status')).toContainText(/gone|already|nicht mehr/i);
});
