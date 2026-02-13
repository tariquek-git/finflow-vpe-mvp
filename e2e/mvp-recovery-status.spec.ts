import { expect, test } from '@playwright/test';

test('backup status moves from not-created to available and persists after reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');

  const status = page.getByTestId('backup-status-indicator');
  await expect(status).toHaveText('Backup: Not yet created');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('toolbar-reset-canvas').click();

  await expect(status).toHaveText('Backup: Available');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('backup-status-indicator')).toHaveText('Backup: Available');
});
