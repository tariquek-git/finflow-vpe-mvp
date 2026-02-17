import { expect, test, type Page } from '@playwright/test';

const openFileMenu = async (page: Page) => {
  const strip = page.getByTestId('primary-actions-strip').first();
  const menu = strip.getByTestId('toolbar-file-menu').first();
  if (await menu.isVisible()) return menu;
  await strip.getByTestId('toolbar-file-trigger').first().click();
  await expect(menu).toBeVisible();
  return menu;
};

const insertStarterTemplate = async (page: Page) => {
  const menu = await openFileMenu(page);
  await menu.getByTestId('toolbar-insert-starter-template').click();
  await expect(page.locator('[data-node-id="starter-sponsor"]')).toBeVisible();
};

const clickNodeByLabel = async (page: Page, label: string) => {
  const node = page.locator(`[data-node-label="${label}"]`).first();
  await expect(node).toBeVisible();
  const box = await node.boundingBox();
  if (!box) {
    throw new Error(`No bounding box for node "${label}"`);
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};

const clickCanvasBlank = async (page: Page) => {
  const canvas = page.getByTestId('canvas-dropzone');
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Canvas bounds unavailable');
  }
  await page.mouse.click(box.x + box.width * 0.5, box.y + 24);
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

test('menus open and close reliably by outside click and escape', async ({ page }) => {
  const fileMenu = await openFileMenu(page);
  await expect(fileMenu).toBeVisible();
  await clickCanvasBlank(page);
  await expect(fileMenu).not.toBeVisible();

  const viewTrigger = page.getByTestId('toolbar-view-trigger').first();
  await viewTrigger.click();
  const viewMenu = page.getByTestId('toolbar-view-menu').first();
  await expect(viewMenu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(viewMenu).not.toBeVisible();
});

test('node select and click-off clear work with mouse', async ({ page }) => {
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Node');

  await clickCanvasBlank(page);
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Nothing selected');
});

test('connect pending state cancels by click-off', async ({ page }) => {
  await page.getByLabel('Connect tool').click();
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.getByTestId('cancel-pending-connection')).toBeVisible();

  await clickCanvasBlank(page);
  await expect(page.getByTestId('cancel-pending-connection')).toHaveCount(0);
});

test('port clicks in select mode arm and cancel direct connection predictably', async ({ page }) => {
  await page.getByLabel('Select tool').click();
  await clickNodeByLabel(page, 'Sponsor Bank');
  const sourceHandle = page.getByTestId('node-port-starter-sponsor-1');
  await expect(sourceHandle).toBeVisible();
  await sourceHandle.click();
  await expect(page.getByTestId('cancel-pending-connection')).toBeVisible();

  await clickCanvasBlank(page);
  await expect(page.getByTestId('cancel-pending-connection')).toHaveCount(0);
});
