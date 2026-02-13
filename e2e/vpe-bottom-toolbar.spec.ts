import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('bottom toolbar uses progressive disclosure for advanced controls', async ({ page }) => {
  const bottomToolbar = page.getByTestId('bottom-toolbar-panel');
  await expect(bottomToolbar).toBeVisible();

  await expect(bottomToolbar.getByText('Tool', { exact: true })).toBeVisible();
  await expect(bottomToolbar.getByText('Insert', { exact: true })).toBeVisible();
  await expect(bottomToolbar.getByText('Canvas', { exact: true })).toBeVisible();

  const arrangeToggle = page.getByRole('button', { name: 'Toggle arrange controls' });
  const edgeToggle = page.getByRole('button', { name: 'Toggle edge styling controls' });
  await expect(arrangeToggle).toBeVisible();
  await expect(edgeToggle).toBeVisible();

  await expect(arrangeToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(edgeToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByTestId('toolbar-arrange-panel')).toHaveCount(0);
  await expect(page.getByTestId('toolbar-edge-panel')).toHaveCount(0);

  await arrangeToggle.click();
  await expect(arrangeToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('toolbar-arrange-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duplicate selected nodes' })).toBeVisible();

  await edgeToggle.click();
  await expect(edgeToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('toolbar-edge-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: 'solid line style' })).toBeVisible();

  await arrangeToggle.click();
  await edgeToggle.click();
  await expect(arrangeToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(edgeToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByTestId('toolbar-arrange-panel')).toHaveCount(0);
  await expect(page.getByTestId('toolbar-edge-panel')).toHaveCount(0);
});

test('non-interactive toolbar shell does not block canvas clicks', async ({ page }) => {
  const canvas = page.getByTestId('canvas-dropzone');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas bounding box unavailable');

  const probePoint = {
    x: Math.max(0, Math.floor(box.x + box.width - 8)),
    y: Math.max(0, Math.floor(box.y + box.height - 8))
  };

  const hitResult = await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y);
    if (!target) {
      return { inCanvas: false, inBottomToolbar: false };
    }
    return {
      inCanvas: !!target.closest('[data-testid="canvas-dropzone"]'),
      inBottomToolbar: !!target.closest('[data-testid="bottom-toolbar-panel"]')
    };
  }, probePoint);

  expect(hitResult.inCanvas).toBe(true);
  expect(hitResult.inBottomToolbar).toBe(false);
});
