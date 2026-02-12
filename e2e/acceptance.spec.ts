import { expect, test, type Page } from '@playwright/test';

const EDGE_SELECTOR = 'svg g.cursor-pointer.group';

const clickNodeByLabel = async (page: Page, label: string, shift = false) => {
  const locator = page.locator('div.group.absolute').filter({ hasText: label }).first();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Could not find node bounding box for ${label}`);
  }
  if (shift) {
    await page.keyboard.down('Shift');
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  if (shift) {
    await page.keyboard.up('Shift');
  }
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('starter diagram is loaded and can be edited', async ({ page }) => {
  await expect(page.locator('div.group.absolute').filter({ hasText: 'Sponsor Bank' }).first()).toBeVisible();
  await expect(page.locator('div.group.absolute').filter({ hasText: 'Processor' }).first()).toBeVisible();
  await expect(page.locator('div.group.absolute').filter({ hasText: 'Card Network' }).first()).toBeVisible();

  const duplicateButton = page.locator('button[title="Duplicate selected nodes"]');
  await expect(duplicateButton).toBeDisabled();

  await clickNodeByLabel(page, 'Sponsor Bank');
  await clickNodeByLabel(page, 'Processor', true);

  await expect(duplicateButton).toBeEnabled();

  const beforeNodeCount = await page.locator('div.group.absolute').count();
  await duplicateButton.click();
  await expect.poll(async () => page.locator('div.group.absolute').count()).toBeGreaterThan(beforeNodeCount);
});

test('connector drag-drop from toolbar into canvas inserts a connector edge', async ({ page }) => {
  const beforeEdges = await page.locator(EDGE_SELECTOR).count();

  await page.evaluate(() => {
    const connectorButton = document.querySelector('[data-testid="toolbar-insert-connector"]');
    const canvas = document.querySelector('[data-testid="canvas-dropzone"]');
    if (!connectorButton || !canvas) {
      throw new Error('Missing connector button or canvas dropzone');
    }

    const transfer = new DataTransfer();
    connectorButton.dispatchEvent(
      new DragEvent('dragstart', { dataTransfer: transfer, bubbles: true, cancelable: true })
    );

    const rect = canvas.getBoundingClientRect();
    const x = rect.left + rect.width * 0.68;
    const y = rect.top + rect.height * 0.58;

    canvas.dispatchEvent(
      new DragEvent('dragover', {
        dataTransfer: transfer,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true
      })
    );

    canvas.dispatchEvent(
      new DragEvent('drop', {
        dataTransfer: transfer,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true
      })
    );
  });

  await expect.poll(async () => page.locator(EDGE_SELECTOR).count()).toBe(beforeEdges + 1);
});

test('reset and restore recover previous workspace state', async ({ page }) => {
  const connectorButton = page.locator('[data-testid="toolbar-insert-connector"]');
  await connectorButton.click();
  const modifiedEdgeCount = await page.locator(EDGE_SELECTOR).count();
  await expect(modifiedEdgeCount).toBeGreaterThan(2);

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-testid="toolbar-reset-canvas"]').click();
  await expect.poll(async () => page.locator(EDGE_SELECTOR).count()).toBe(2);

  const restoreButton = page.locator('[data-testid="toolbar-restore"]');
  await expect(restoreButton).toBeEnabled();
  await restoreButton.click();

  await expect.poll(async () => page.locator(EDGE_SELECTOR).count()).toBe(modifiedEdgeCount);
});

test('edge style controls respond for selected connector', async ({ page }) => {
  await page.locator('[data-testid="toolbar-insert-connector"]').click();

  const dashedButton = page.locator('button[title="dashed line style"]');
  const dottedButton = page.locator('button[title="dotted line style"]');
  const solidButton = page.locator('button[title="solid line style"]');
  const arrowHeadButton = page.locator('button[title="Toggle arrow head"]');
  const midArrowButton = page.locator('button[title="Toggle middle arrow"]');

  await expect(dashedButton).toBeEnabled();
  await dashedButton.click();
  await expect(dashedButton).toHaveAttribute('aria-pressed', 'true');

  await dottedButton.click();
  await expect(dottedButton).toHaveAttribute('aria-pressed', 'true');

  await solidButton.click();
  await expect(solidButton).toHaveAttribute('aria-pressed', 'true');

  await arrowHeadButton.click();
  await midArrowButton.click();
});
