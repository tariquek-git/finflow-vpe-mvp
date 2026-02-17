import { expect, test, type Page } from '@playwright/test';
import { insertStarterTemplate } from './helpers/diagramSetup';

const EDGE_SELECTOR = '[data-testid^="edge-"]:not([data-testid^="edge-label-"])';

const clickCanvasCenter = async (page: Page) => {
  const canvas = page.getByTestId('canvas-dropzone');
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Canvas bounds unavailable');
  }
  await page.mouse.click(box.x + box.width * 0.44, box.y + box.height * 0.36);
};

const dragPortToPort = async (page: Page, sourceTestId: string, targetTestId: string) => {
  const source = page.getByTestId(sourceTestId);
  const target = page.getByTestId(targetTestId);
  await expect(source).toBeVisible();
  const sourceBox = await source.boundingBox();
  if (!sourceBox) {
    throw new Error('Could not resolve source port bounds.');
  }
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await expect(target).toBeVisible();
  const targetBox = await target.boundingBox();
  if (!targetBox) {
    throw new Error('Could not resolve target port bounds.');
  }
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
  await page.mouse.up();
};

test('minimal interactions: note drag moves and direct connect creates an edge', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await insertStarterTemplate(page);
  await page.getByRole('button', { name: 'Select tool' }).click();
  const beforeEdges = await page.locator(EDGE_SELECTOR).count();

  await page.locator('[data-node-id="starter-sponsor"]').first().click();
  await dragPortToPort(page, 'node-port-starter-sponsor-1', 'node-port-starter-processor-3');
  await expect.poll(() => page.locator(EDGE_SELECTOR).count()).toBe(beforeEdges + 1);

  await page.getByLabel('Text tool').click();
  await clickCanvasCenter(page);

  const noteNode = page.locator('[data-node-label="Text Box"]').first();
  await expect(noteNode).toBeVisible();
  const before = await noteNode.boundingBox();
  if (!before) throw new Error('Could not read note bounds before drag.');

  const startX = before.x + before.width / 2;
  const startY = before.y + before.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 120, startY + 80, { steps: 12 });
  await page.mouse.up();

  const after = await noteNode.boundingBox();
  if (!after) throw new Error('Could not read note bounds after drag.');
  const travel = Math.hypot(after.x - before.x, after.y - before.y);
  expect(travel).toBeGreaterThan(24);
});
