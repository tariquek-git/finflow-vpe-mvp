import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('mobile toolbar controls are discoverable and clickable', async ({ page }) => {
  const strip = page.getByTestId('primary-actions-strip');
  await expect(strip).toBeVisible();
  const fileTrigger = strip.getByTestId('toolbar-file-trigger').first();
  const help = page.getByRole('button', { name: 'Help' });
  const fileMenu = strip.getByTestId('toolbar-file-menu').first();

  const ensureFileMenuOpen = async () => {
    if (!(await fileMenu.isVisible())) {
      await fileTrigger.click();
      if (!(await fileMenu.isVisible())) {
        await fileTrigger.click();
      }
      await expect(fileMenu).toBeVisible();
    }
  };

  await expect(fileTrigger).toBeVisible();
  await expect(help).toBeVisible();

  await ensureFileMenuOpen();
  const restore = fileMenu.getByTestId('toolbar-restore');
  const importJson = fileMenu.getByTestId('toolbar-import-json');
  const exportJson = fileMenu.getByTestId('toolbar-export-json');
  await expect(restore).toBeVisible();
  await expect(importJson).toBeVisible();

  await restore.click();
  await expect(page.getByTestId('toast-message').first()).toContainText('No recovery snapshot yet');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportJson.click()
  ]);
  expect(download.suggestedFilename()).toContain('finflow-diagram-');

  const chooserPromise = page.waitForEvent('filechooser');
  await ensureFileMenuOpen();
  await expect(importJson).toBeVisible();
  await importJson.click();
  const chooser = await chooserPromise;
  expect(chooser.isMultiple()).toBe(false);
});
