import { expect, test, type Page } from '@playwright/test';
import { insertStarterTemplate } from './helpers/diagramSetup';

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

const openViewMenu = async (page: Page) => {
  const menu = page.getByTestId('toolbar-view-menu').first();
  if (await menu.isVisible()) {
    return;
  }
  const trigger = page.getByTestId('toolbar-view-trigger').first();
  await trigger.click();
  try {
    await expect(menu).toBeVisible({ timeout: 1000 });
  } catch {
    await trigger.click();
  }
  await expect(menu).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await insertStarterTemplate(page);
});

test('connector click inserts then delete removes it', async ({ page }) => {
  const solidStyleButton = page.locator('button[title="solid line style"]');
  await expect(solidStyleButton).toHaveCount(0);

  const before = await countEdges(page);
  await page.locator(CONNECTOR_SELECTOR).click();
  await expect.poll(async () => countEdges(page)).toBe(before + 1);
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Connector');
  await page.keyboard.press('Delete');
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

test('view menu exposes single-source canvas toggles', async ({ page }) => {
  await openViewMenu(page);
  await expect(page.getByTestId('toolbar-view-grid').first()).toBeVisible();
  await expect(page.getByTestId('toolbar-view-snap').first()).toBeVisible();
  await expect(page.getByTestId('toolbar-view-lanes')).toHaveCount(0);
});

test('space drag pans the canvas viewport', async ({ page }) => {
  const canvas = page.locator(CANVAS_SELECTOR);
  const worldLayer = canvas.locator('div.absolute.inset-0').first();

  const before = await worldLayer.getAttribute('style');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas bounding box not found');

  await canvas.click({ position: { x: 24, y: 24 } });
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

test('keyboard shortcuts switch tools and escape clears selection', async ({ page }) => {
  const selectTool = page.getByRole('button', { name: 'Select tool' });
  const connectTool = page.getByRole('button', { name: 'Connect tool' });
  const textTool = page.getByRole('button', { name: 'Text tool' });

  await page.keyboard.press('c');
  await expect(connectTool).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('t');
  await expect(textTool).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('v');
  await expect(selectTool).toHaveAttribute('aria-pressed', 'true');

  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.locator('button[title="Duplicate selected node"]')).toBeVisible();

  await page.keyboard.press('Escape');
  if ((await page.locator('button[title="Duplicate selected node"]').count()) > 0) {
    await page.keyboard.press('Escape');
  }
  await expect(page.locator('button[title="Duplicate selected node"]')).toHaveCount(0);
});

test('inspector mode follows current selection context', async ({ page }) => {
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Node');

  await page.locator(CONNECTOR_SELECTOR).click();
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Edge');
});

test('escape clears selection and returns inspector to empty mode', async ({ page }) => {
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Node');

  await page.keyboard.press('Escape');
  if (!(await page.getByTestId('inspector-mode-title').innerText()).includes('Nothing selected')) {
    await page.keyboard.press('Escape');
  }
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Nothing selected');
});
