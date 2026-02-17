import { expect, test, type Locator, type Page } from '@playwright/test';

test.skip(true, 'Swimlanes were removed from the MVP canvas.');

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

const getNodeCanvasX = async (node: Locator) => {
  return node.evaluate((element) => {
    const rawLeft = (element as HTMLElement).style.left;
    const parsed = Number.parseFloat(rawLeft);
    return Number.isFinite(parsed) ? parsed : 0;
  });
};

const openLaneMoreMenu = async (page: Page, laneId: number) => {
  const trigger = page.getByTestId(`swimlane-more-trigger-${laneId}`);
  if (!(await page.getByTestId(`swimlane-toggle-lock-${laneId}`).isVisible().catch(() => false))) {
    await trigger.click();
  }
  await expect(page.getByTestId(`swimlane-toggle-lock-${laneId}`)).toBeVisible();
};

const clickCanvasBlank = async (page: Page) => {
  const canvas = page.getByTestId('canvas-dropzone');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas bounds unavailable');
  await page.mouse.click(box.x + box.width * 0.82, box.y + 20);
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
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
  await page.getByLabel('Select tool').click();

  const sponsorNode = page.locator('[data-node-id="starter-sponsor"]');
  await expect(sponsorNode).toBeVisible();

  const initialX = await getNodeCanvasX(sponsorNode);

  await openLaneMoreMenu(page, 2);
  await page.getByTestId('swimlane-toggle-lock-2').click();
  await openLaneMoreMenu(page, 2);
  await expect(page.getByTestId('swimlane-toggle-lock-2')).toContainText('Unlock lane');
  await clickCanvasBlank(page);
  await dragNodeBy(page, sponsorNode, 120, 0);
  const lockedX = await getNodeCanvasX(sponsorNode);
  expect(Math.abs(lockedX - initialX)).toBeLessThan(6);

  await openLaneMoreMenu(page, 2);
  await page.getByTestId('swimlane-toggle-lock-2').click();
  await openLaneMoreMenu(page, 2);
  await expect(page.getByTestId('swimlane-toggle-lock-2')).toContainText('Lock lane');
  await clickCanvasBlank(page);
  await dragNodeBy(page, sponsorNode, 120, 0);
  const unlockedX = await getNodeCanvasX(sponsorNode);
  expect(Math.abs(unlockedX - lockedX)).toBeGreaterThan(20);
});

test('swimlane inspector controls rename and lane state toggles', async ({ page }) => {
  await page.goto('/');
  await insertStarterTemplate(page);

  await page.getByTestId('swimlane-title-trigger-2').click();
  await expect(page.getByTestId('inspector-swimlane-panel')).toBeVisible();

  const laneNameInput = page.getByTestId('inspector-swimlane-name');
  await laneNameInput.fill('Program Rail');
  await laneNameInput.press('Enter');
  await expect(page.getByText('Program Rail').first()).toBeVisible();

  const sponsorNode = page.locator('[data-node-id="starter-sponsor"]');
  await expect(sponsorNode).toBeVisible();

  await page.getByTestId('inspector-swimlane-toggle-collapse').click();
  await expect(sponsorNode).toBeHidden();

  await page.getByTestId('inspector-swimlane-toggle-collapse').click();
  await expect(sponsorNode).toBeVisible();
});

test('swimlane header title supports inline edit, blank placeholder, and escape cancel', async ({ page }) => {
  await page.goto('/');
  await insertStarterTemplate(page);

  const laneTitleTrigger = page.getByTestId('swimlane-title-trigger-2');
  await laneTitleTrigger.click();
  const laneTitleInput = page.getByTestId('swimlane-title-input-2');
  await expect(laneTitleInput).toBeVisible();
  await laneTitleInput.fill('');
  await laneTitleInput.press('Enter');

  await expect(page.getByTestId('swimlane-title-trigger-2')).toContainText('Name this lane');

  await page.getByTestId('swimlane-title-trigger-2').click();
  await page.getByTestId('swimlane-title-input-2').fill('Program Rail');
  await page.getByTestId('swimlane-title-input-2').press('Enter');
  await expect(page.getByTestId('swimlane-title-trigger-2')).toContainText('Program Rail');

  await page.getByTestId('swimlane-title-trigger-2').click();
  await page.getByTestId('swimlane-title-input-2').fill('Transient Name');
  await page.getByTestId('swimlane-title-input-2').press('Escape');
  await expect(page.getByTestId('swimlane-title-trigger-2')).toContainText('Program Rail');
});
