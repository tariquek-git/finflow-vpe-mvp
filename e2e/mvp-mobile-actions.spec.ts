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

test('primary actions are visible and grouped on mobile', async ({ page }) => {
  const strip = page.getByTestId('primary-actions-strip');
  await expect(strip).toBeVisible();
  await expect(strip.getByTestId('toolbar-file-trigger')).toBeVisible();

  const fileTrigger = strip.getByTestId('toolbar-file-trigger').first();
  await fileTrigger.click();
  const fileMenu = strip.getByTestId('toolbar-file-menu').first();
  if (!(await fileMenu.isVisible())) {
    await fileTrigger.click();
  }
  await expect(fileMenu).toBeVisible();
  await expect(fileMenu.getByTestId('toolbar-restore')).toBeVisible();
  await expect(fileMenu.getByTestId('toolbar-reset-canvas')).toBeVisible();
  await expect(fileMenu.getByTestId('toolbar-import-json')).toBeVisible();
  await expect(fileMenu.getByTestId('toolbar-export-json')).toBeVisible();
});
