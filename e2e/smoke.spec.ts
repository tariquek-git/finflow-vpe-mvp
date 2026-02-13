import { expect, test, type Page } from '@playwright/test';

const EDGE_SELECTOR = 'svg g.cursor-pointer.group';
const CONNECTOR_SELECTOR = '[data-testid="toolbar-insert-connector"]';
const CANVAS_SELECTOR = '[data-testid="canvas-dropzone"]';

const countEdges = async (page: Page) => {
  return page.locator(EDGE_SELECTOR).count();
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('connector click inserts then delete removes it', async ({ page }) => {
  const edgeToggle = page.getByRole('button', { name: 'Toggle edge styling controls' });
  await edgeToggle.click();
  await expect(edgeToggle).toHaveAttribute('aria-expanded', 'true');

  const solidStyleButton = page.locator('button[title="solid line style"]');
  await expect(solidStyleButton).toBeDisabled();

  const before = await countEdges(page);
  await page.locator(CONNECTOR_SELECTOR).click();
  await expect.poll(async () => countEdges(page)).toBe(before + 1);
  await expect(solidStyleButton).toBeEnabled();

  await page.locator('button[title="Delete selected"]').click();
  await expect.poll(async () => countEdges(page)).toBe(before);
});

test('connector insert supports undo and redo', async ({ page }) => {
  const before = await countEdges(page);
  const connector = page.locator(CONNECTOR_SELECTOR);
  await connector.click();
  await expect.poll(async () => countEdges(page)).toBe(before + 1);

  await page.locator('button[title="Undo"]').click();
  await expect.poll(async () => countEdges(page)).toBe(before);

  await page.locator('button[title="Redo"]').click();
  await expect.poll(async () => countEdges(page)).toBe(before + 1);
});

test('layout panel exposes swimlane controls', async ({ page }) => {
  await page.locator('button[title="Open layout controls"]').click();
  await expect(page.getByRole('button', { name: 'Add Swimlane' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Swimlanes:/ })).toBeVisible();
});

test('space drag pans the canvas viewport', async ({ page }) => {
  const canvas = page.locator(CANVAS_SELECTOR);
  const worldLayer = canvas.locator('div.absolute.inset-0').first();

  const before = await worldLayer.getAttribute('style');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas bounding box not found');

  await page.keyboard.down('Space');
  await page.mouse.move(box.x + 300, box.y + 220);
  await page.mouse.down();
  await page.mouse.move(box.x + 420, box.y + 300);
  await page.mouse.up();
  await page.keyboard.up('Space');

  await expect.poll(async () => worldLayer.getAttribute('style')).not.toBe(before);
});

test('delete key removes selected connector', async ({ page }) => {
  const before = await countEdges(page);
  await page.locator(CONNECTOR_SELECTOR).click();
  await expect.poll(async () => countEdges(page)).toBe(before + 1);

  await page.keyboard.press('Delete');
  await expect.poll(async () => countEdges(page)).toBe(before);
});
