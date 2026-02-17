import { expect, test } from '@playwright/test';

test('quick start panel is shown on first run and dismissal persists', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  const panel = page.getByTestId('quickstart-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Quick Start');

  await page.getByTestId('quickstart-dismiss').click();
  await expect(panel).toBeHidden();

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('quickstart-panel')).toBeHidden();
});
