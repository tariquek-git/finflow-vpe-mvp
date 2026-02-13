import { expect, test, type Page } from '@playwright/test';

const CANVAS_SELECTOR = '[data-testid="canvas-dropzone"]';
const TRANSFORM_LAYER_SELECTOR = '[data-testid="canvas-transform-layer"]';

const getNodePosition = async (page: Page, nodeId: string) => {
  return page.locator(`[data-node-id="${nodeId}"]`).evaluate((node) => {
    const element = node as HTMLElement;
    return {
      left: Number.parseFloat(element.style.left || '0'),
      top: Number.parseFloat(element.style.top || '0')
    };
  });
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('drag snapping uses 20px increments', async ({ page }) => {
  const sponsor = page.locator('[data-node-id="starter-sponsor"]');
  await expect(sponsor).toBeVisible();
  const box = await sponsor.boundingBox();
  if (!box) throw new Error('Starter sponsor node is not visible');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 37, box.y + box.height / 2 + 29);
  await page.mouse.up();

  const next = await getNodePosition(page, 'starter-sponsor');
  const xStep = next.left / 20;
  const yStep = next.top / 20;
  expect(Math.abs(xStep - Math.round(xStep))).toBeLessThan(0.001);
  expect(Math.abs(yStep - Math.round(yStep))).toBeLessThan(0.001);
});

test('alignment guides appear while dragging near aligned peers', async ({ page }) => {
  const sponsor = page.locator('[data-node-id="starter-sponsor"]');
  const processor = page.locator('[data-node-id="starter-processor"]');
  await expect(sponsor).toBeVisible();
  await expect(processor).toBeVisible();

  const sponsorBox = await sponsor.boundingBox();
  const processorBox = await processor.boundingBox();
  if (!sponsorBox || !processorBox) throw new Error('Starter nodes are not visible');

  await page.mouse.move(processorBox.x + processorBox.width / 2, processorBox.y + processorBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    sponsorBox.x + sponsorBox.width / 2 + 260,
    sponsorBox.y + sponsorBox.height / 2 + 2
  );
  await expect
    .poll(async () => page.getByTestId('alignment-guide').count())
    .toBeGreaterThan(0);
  await page.mouse.up();
});

test('zoom is clamped between 50% and 200%', async ({ page }) => {
  const canvas = page.locator(CANVAS_SELECTOR);
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not visible');

  const getZoom = async () =>
    page.locator(TRANSFORM_LAYER_SELECTOR).evaluate((layer) => {
      const style = layer.getAttribute('style') || '';
      const match = style.match(/scale\(([^)]+)\)/);
      return match ? Number.parseFloat(match[1]) : 1;
    });

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.down('Control');
  for (let idx = 0; idx < 30; idx += 1) {
    await page.mouse.wheel(0, 220);
  }
  await page.keyboard.up('Control');

  const minZoom = await getZoom();
  expect(minZoom).toBeGreaterThanOrEqual(0.5);

  await page.keyboard.down('Control');
  for (let idx = 0; idx < 35; idx += 1) {
    await page.mouse.wheel(0, -220);
  }
  await page.keyboard.up('Control');

  const maxZoom = await getZoom();
  expect(maxZoom).toBeLessThanOrEqual(2.0);
});
