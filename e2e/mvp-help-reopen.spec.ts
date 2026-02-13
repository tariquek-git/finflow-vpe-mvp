import { expect, test } from '@playwright/test';

test('help control reopens quick start after dismissal while dismissal persists across reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');

  const panel = page.getByTestId('quickstart-panel');
  await expect(panel).toBeVisible();

  await page.getByTestId('quickstart-dismiss').click();
  await expect(panel).toBeHidden();

  await page.getByTestId('toolbar-help-open').click();
  await expect(panel).toBeVisible();

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('quickstart-panel')).toBeHidden();
});
