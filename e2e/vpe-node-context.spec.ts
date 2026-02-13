import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('selected node shows context toolbar and cardinal handles', async ({ page }) => {
  const sponsorNode = page.locator('[data-node-id="starter-sponsor"]');
  await expect(sponsorNode).toBeVisible();
  await sponsorNode.click();

  await expect(sponsorNode).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('node-context-toolbar')).toBeVisible();
  await expect(page.getByTestId('node-handle-n').first()).toBeVisible();
  await expect(page.getByTestId('node-handle-e').first()).toBeVisible();
  await expect(page.getByTestId('node-handle-s').first()).toBeVisible();
  await expect(page.getByTestId('node-handle-w').first()).toBeVisible();
});

test('context toolbar actions edit duplicate and delete function', async ({ page }) => {
  const sponsorNode = page.locator('[data-node-id="starter-sponsor"]');
  await expect(sponsorNode).toBeVisible();
  await sponsorNode.click();

  const toolbar = page.getByTestId('node-context-toolbar');
  await expect(toolbar).toBeVisible();

  await page.getByRole('button', { name: 'Edit selected node' }).click();
  await expect(page.getByRole('heading', { name: 'Entity Profile' })).toBeVisible();

  const nodes = page.locator('[data-testid="canvas-node"]');
  const beforeCount = await nodes.count();

  await sponsorNode.click();
  await toolbar.getByRole('button', { name: 'Duplicate selected node' }).click();
  await expect.poll(async () => nodes.count()).toBe(beforeCount + 1);

  await toolbar.getByRole('button', { name: 'Delete selected node' }).click();
  await expect.poll(async () => nodes.count()).toBe(beforeCount);
});
