import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('mobile toolbar controls are discoverable and clickable', async ({ page }) => {
  const topPanel = page.getByTestId('top-toolbar-panel');
  await expect(topPanel).toBeVisible();
  await expect(topPanel).toHaveClass(/ff-floating-panel/);

  const strip = page.getByTestId('primary-actions-strip');
  await expect(strip).toBeVisible();
  await expect(strip).toContainText('Primary Actions');

  const restore = page.getByRole('button', { name: 'Restore Backup' });
  const reset = page.getByRole('button', { name: 'Reset' });
  const importJson = page.getByRole('button', { name: 'Import JSON' });
  const exportJson = page.getByRole('button', { name: 'Export JSON' });
  const help = page.getByRole('button', { name: 'Help' });

  await expect(restore).toBeVisible();
  await expect(reset).toBeVisible();
  await expect(importJson).toBeVisible();
  await expect(exportJson).toBeVisible();
  await expect(help).toBeVisible();

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport unavailable');
  const exportBox = await exportJson.boundingBox();
  if (!exportBox) throw new Error('Export button box unavailable');
  expect(exportBox.x).toBeGreaterThanOrEqual(0);
  expect(exportBox.x + exportBox.width).toBeLessThanOrEqual(viewport.width + 1);

  await restore.click();
  await expect(page.getByTestId('toast-message').first()).toContainText('No recovery snapshot yet');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportJson.click()
  ]);
  expect(download.suggestedFilename()).toContain('finflow-diagram-');

  const chooserPromise = page.waitForEvent('filechooser');
  await importJson.click();
  const chooser = await chooserPromise;
  expect(chooser.isMultiple()).toBe(false);
});
