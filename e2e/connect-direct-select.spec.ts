import { expect, test, type Page } from '@playwright/test';
import { insertStarterTemplate } from './helpers/diagramSetup';

const EDGE_SELECTOR = '[data-testid^="edge-"]:not([data-testid^="edge-label-"])';

const countEdges = async (page: Page) => page.locator(EDGE_SELECTOR).count();

const clickNode = async (page: Page, nodeId: string) => {
  const node = page.locator(`[data-node-id="${nodeId}"]`).first();
  await expect(node).toBeVisible();
  await node.click();
};

const dragPortToPort = async (page: Page, sourceTestId: string, targetTestId: string) => {
  const source = page.getByTestId(sourceTestId);
  const target = page.getByTestId(targetTestId);
  await expect(source).toBeVisible();
  const sourceBox = await source.boundingBox();
  if (!sourceBox) {
    throw new Error('Could not resolve source handle bounds.');
  }
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await expect(target).toBeVisible();
  const targetBox = await target.boundingBox();
  if (!targetBox) {
    throw new Error('Could not resolve target handle bounds.');
  }
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
  await page.mouse.up();
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

test('select mode supports direct handle-to-handle connection without switching tools', async ({ page }) => {
  await page.getByRole('button', { name: 'Select tool' }).click();
  const before = await countEdges(page);

  await clickNode(page, 'starter-sponsor');
  await dragPortToPort(page, 'node-port-starter-sponsor-1', 'node-port-starter-processor-3');

  await expect.poll(async () => countEdges(page)).toBe(before + 1);
});

test('connect tool remains sticky for chained connections', async ({ page }) => {
  const before = await countEdges(page);

  await page.getByRole('button', { name: 'Connect tool' }).click();
  await expect(page.getByRole('button', { name: 'Connect tool' })).toHaveAttribute('aria-pressed', 'true');

  await clickNode(page, 'starter-sponsor');
  await clickNode(page, 'starter-processor');
  await expect.poll(async () => countEdges(page)).toBe(before + 1);

  await clickNode(page, 'starter-sponsor');
  await clickNode(page, 'starter-network');
  await expect.poll(async () => countEdges(page)).toBe(before + 2);
});
