import { expect, test } from '@playwright/test';
import { insertStarterTemplate, openFileMenu } from './helpers/diagramSetup';

const EDGE_SELECTOR = '[data-testid^="edge-"]:not([data-testid^="edge-label-"])';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('new workspace opens blank and starter template can be inserted explicitly', async ({ page }) => {
  await expect(page.locator('[data-node-id]')).toHaveCount(0);
  await expect(page.locator(EDGE_SELECTOR)).toHaveCount(0);

  await insertStarterTemplate(page);
  await expect(page.locator('[data-node-id]')).toHaveCount(3);
  await expect(page.locator(EDGE_SELECTOR)).toHaveCount(2);
});

test('reset clears to blank and keeps recovery snapshot available', async ({ page }) => {
  await insertStarterTemplate(page);
  await expect(page.getByTestId('backup-status-indicator')).toHaveAttribute('data-last-saved-at', '');

  page.once('dialog', (dialog) => dialog.accept());
  const menu = await openFileMenu(page);
  await menu.getByTestId('toolbar-reset-canvas').click();

  await expect(page.locator('[data-node-id]')).toHaveCount(0);
  await expect(page.locator(EDGE_SELECTOR)).toHaveCount(0);
  await expect(page.getByTestId('backup-status-indicator')).not.toHaveAttribute('data-last-saved-at', '');
});
