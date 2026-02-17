import { expect, test } from '@playwright/test';

const insertStarterTemplate = async (page: import('@playwright/test').Page) => {
  await page.getByTestId('toolbar-file-trigger').click();
  await page.getByTestId('toolbar-insert-starter-template').click();
  await expect(page.locator('[data-node-id="starter-sponsor"]')).toBeVisible();
};

test('desktop tray stays node-focused and excludes edge styling controls', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await insertStarterTemplate(page);

  await page.getByTestId('toolbar-insert-connector').click();
  await expect(page.getByTestId('selection-action-tray')).toHaveCount(0);
  await expect(page.locator('button[title="straight edge path"]')).toHaveCount(0);

  await page.getByTestId('bottom-tool-hand').click();
  await expect(page.getByTestId('bottom-tool-hand')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('selection-action-tray')).toHaveCount(0);

  await page.getByTestId('bottom-tool-select').click();
  await expect(page.getByTestId('bottom-tool-select')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('selection-action-tray')).toHaveCount(0);

  await page.locator('[data-node-id="starter-sponsor"]').click();
  await page.keyboard.down('Shift');
  await page.locator('[data-node-id="starter-processor"]').click();
  await page.keyboard.up('Shift');
  await expect(page.getByTestId('selection-action-tray')).toBeVisible();
  await expect(page.locator('button[title="dashed line style"]')).toHaveCount(0);
});

test('mobile bottom more-actions stays node-focused with no edge style controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await insertStarterTemplate(page);

  await page.getByTestId('bottom-tool-hand').click();
  await expect(page.getByTestId('bottom-tool-hand')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('bottom-more-actions')).toHaveCount(0);

  await page.getByTestId('bottom-tool-select').click();
  await page.locator('[data-node-id="starter-sponsor"]').click();
  const moreButton = page.getByTestId('bottom-more-actions');
  await expect(moreButton).toBeVisible();
  await moreButton.click();

  const overflow = page.getByTestId('bottom-overflow-sheet');
  await expect(overflow).toBeVisible();
  await expect(overflow.locator('button[title="Duplicate selected nodes"]')).toBeVisible();
  await expect(overflow.locator('button[title="dashed line style"]')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await page.getByTestId('toolbar-insert-connector').click();
  await expect(page.getByTestId('bottom-more-actions')).toHaveCount(0);
});
