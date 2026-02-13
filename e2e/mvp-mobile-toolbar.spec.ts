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

  const bottomToolbar = page.getByTestId('bottom-toolbar-panel');
  await expect(bottomToolbar).toBeVisible();

  const arrangeToggle = page.getByRole('button', { name: 'Toggle arrange controls' });
  const edgeToggle = page.getByRole('button', { name: 'Toggle edge styling controls' });
  await expect(arrangeToggle).toBeVisible();
  await expect(edgeToggle).toBeVisible();
  await expect(arrangeToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(edgeToggle).toHaveAttribute('aria-expanded', 'false');

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport unavailable');
  const exportBox = await exportJson.boundingBox();
  if (!exportBox) throw new Error('Export button box unavailable');
  expect(exportBox.x).toBeGreaterThanOrEqual(0);
  expect(exportBox.x + exportBox.width).toBeLessThanOrEqual(viewport.width + 1);

  await arrangeToggle.click();
  await expect(arrangeToggle).toHaveAttribute('aria-expanded', 'true');
  const arrangePanel = page.getByTestId('toolbar-arrange-panel');
  await expect(arrangePanel).toBeVisible();

  await edgeToggle.click();
  await expect(edgeToggle).toHaveAttribute('aria-expanded', 'true');
  const edgePanel = page.getByTestId('toolbar-edge-panel');
  await expect(edgePanel).toBeVisible();

  const arrangePanelBox = await arrangePanel.boundingBox();
  const edgePanelBox = await edgePanel.boundingBox();
  if (!arrangePanelBox || !edgePanelBox) throw new Error('Advanced panel bounding box unavailable');
  expect(arrangePanelBox.x).toBeGreaterThanOrEqual(0);
  expect(arrangePanelBox.x + arrangePanelBox.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(edgePanelBox.x).toBeGreaterThanOrEqual(0);
  expect(edgePanelBox.x + edgePanelBox.width).toBeLessThanOrEqual(viewport.width + 1);

  const hasHorizontalOverflow = await page.evaluate(() => {
    const root = document.scrollingElement;
    if (!root) return false;
    return root.scrollWidth - root.clientWidth > 1;
  });
  expect(hasHorizontalOverflow).toBe(false);

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
