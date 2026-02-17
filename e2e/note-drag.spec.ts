import { expect, test, type Page } from '@playwright/test';

const clickCanvasCenter = async (page: Page) => {
  const canvas = page.getByTestId('canvas-dropzone');
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Canvas bounds unavailable');
  }
  // Keep the click away from swimlane headers so text tool insertion is deterministic.
  await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.72);
};

test('text notes can be moved while text tool is active without creating extra notes', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const allNodes = page.locator('[data-node-id]');
  await expect(allNodes).toHaveCount(0);

  const textTool = page.getByTestId('bottom-tool-text').first();
  await textTool.click();
  await expect(textTool).toHaveAttribute('aria-pressed', 'true');
  await clickCanvasCenter(page);

  await expect(allNodes).toHaveCount(1);
  const noteNode = allNodes.first();
  await expect(noteNode).toBeVisible();

  const before = await noteNode.boundingBox();
  if (!before) {
    throw new Error('Could not read note bounds before drag.');
  }

  const startX = before.x + before.width / 2;
  const startY = before.y + before.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 130, startY + 90, { steps: 14 });
  await page.mouse.up();

  const after = await noteNode.boundingBox();
  if (!after) {
    throw new Error('Could not read note bounds after drag.');
  }

  const movedDistance = Math.hypot(after.x - before.x, after.y - before.y);
  expect(movedDistance).toBeGreaterThan(24);
  await expect(allNodes).toHaveCount(1);
});
