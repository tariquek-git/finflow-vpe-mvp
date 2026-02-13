import { expect, test, type Page } from '@playwright/test';

const EDGE_SELECTOR = 'svg g.cursor-pointer.group';
const CONNECTOR_SELECTOR = '[data-testid="toolbar-insert-connector"]';
const CANVAS_SELECTOR = '[data-testid="canvas-dropzone"]';

const countEdges = async (page: Page) => {
  return page.locator(EDGE_SELECTOR).count();
};

const clickNodeByLabel = async (page: Page, label: string) => {
  const locator = page.locator('div.group.absolute').filter({ hasText: label }).first();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Could not find node bounding box for ${label}`);
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('connector click inserts then delete removes it', async ({ page }) => {
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

test('inspector keeps manual tab context and only auto-switches when invalid', async ({ page }) => {
  const canvasTab = page.getByTestId('inspector-tab-canvas');
  const nodeTab = page.getByTestId('inspector-tab-node');
  const edgeTab = page.getByTestId('inspector-tab-edge');

  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(nodeTab).toHaveAttribute('aria-pressed', 'true');

  await canvasTab.click();
  await expect(canvasTab).toHaveAttribute('aria-pressed', 'true');

  await clickNodeByLabel(page, 'Processor');
  await expect(canvasTab).toHaveAttribute('aria-pressed', 'true');

  await nodeTab.click();
  await expect(nodeTab).toHaveAttribute('aria-pressed', 'true');

  await page.locator(CONNECTOR_SELECTOR).click();
  await expect(edgeTab).toHaveAttribute('aria-pressed', 'true');
});

test('inspector restores scroll position per tab', async ({ page }) => {
  await page.locator(CONNECTOR_SELECTOR).click();

  const edgeTab = page.getByTestId('inspector-tab-edge');
  const exportTab = page.getByTestId('inspector-tab-export');
  const scrollBody = page.getByTestId('inspector-scroll-body');

  await edgeTab.click();
  let maxScrollable = await scrollBody.evaluate((el) => Math.max(0, el.scrollHeight - el.clientHeight));
  if (maxScrollable <= 80) {
    const advancedToggle = page.getByTestId('inspector-toggle-edge-advanced');
    if (await advancedToggle.isVisible()) {
      await advancedToggle.click();
      maxScrollable = await scrollBody.evaluate((el) => Math.max(0, el.scrollHeight - el.clientHeight));
    }
  }
  expect(maxScrollable).toBeGreaterThan(80);
  const targetTop = Math.min(220, maxScrollable - 10);

  const edgeTop = await scrollBody.evaluate((el, nextTop) => {
    el.scrollTop = nextTop;
    return el.scrollTop;
  }, targetTop);
  expect(edgeTop).toBeGreaterThan(40);

  await exportTab.click();
  await scrollBody.evaluate((el) => {
    el.scrollTop = 0;
  });

  await edgeTab.click();
  await expect
    .poll(async () => scrollBody.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(Math.max(0, edgeTop - 8));
});
