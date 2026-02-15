import { expect, test, type Locator, type Page } from '@playwright/test';

const openFileMenu = async (page: Page) => {
  const trigger = page.getByTestId('toolbar-file-trigger').first();
  await trigger.click();
  const menu = page.getByTestId('toolbar-file-menu').first();
  await expect(menu).toBeVisible();
  return menu;
};

const insertStarterTemplate = async (page: Page) => {
  const menu = await openFileMenu(page);
  await menu.getByTestId('toolbar-insert-starter-template').click();
  await expect(page.locator('[data-node-id="starter-sponsor"]')).toBeVisible();
};

const dragNodeBy = async (page: Page, node: Locator, dx: number, dy: number) => {
  const box = await node.boundingBox();
  if (!box) throw new Error('node bounding box unavailable');
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 8 });
  await page.mouse.up();
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test('swimlane collapse hides lane nodes and expand restores visibility', async ({ page }) => {
  await page.goto('/');
  await insertStarterTemplate(page);

  const sponsorNode = page.locator('[data-node-id="starter-sponsor"]');
  await expect(sponsorNode).toBeVisible();

  await page.getByTestId('swimlane-toggle-collapse-2').click();
  await expect(sponsorNode).toBeHidden();

  await page.getByTestId('swimlane-toggle-collapse-2').click();
  await expect(sponsorNode).toBeVisible();
});

test('swimlane lock prevents dragging until unlocked', async ({ page }) => {
  await page.goto('/');
  await insertStarterTemplate(page);

  const sponsorNode = page.locator('[data-node-id="starter-sponsor"]');
  await expect(sponsorNode).toBeVisible();

  const initial = await sponsorNode.boundingBox();
  expect(initial).toBeTruthy();

  await page.getByTestId('swimlane-toggle-lock-2').click();
  await dragNodeBy(page, sponsorNode, 120, 0);
  const lockedPosition = await sponsorNode.boundingBox();
  expect(lockedPosition).toBeTruthy();
  expect(Math.abs((lockedPosition?.x || 0) - (initial?.x || 0))).toBeLessThan(6);

  await page.getByTestId('swimlane-toggle-lock-2').click();
  await dragNodeBy(page, sponsorNode, 120, 0);
  const unlockedPosition = await sponsorNode.boundingBox();
  expect(unlockedPosition).toBeTruthy();
  expect(Math.abs((unlockedPosition?.x || 0) - (lockedPosition?.x || 0))).toBeGreaterThan(20);
});
