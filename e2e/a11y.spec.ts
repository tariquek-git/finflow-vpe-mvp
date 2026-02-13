import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('editor has no critical accessibility violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const criticalViolations = results.violations.filter((violation) => violation.impact === 'critical');
  expect(criticalViolations, JSON.stringify(criticalViolations, null, 2)).toEqual([]);
});

test('primary controls expose accessible names', async ({ page }) => {
  await expect(page.getByTestId('top-toolbar-panel')).toBeVisible();
  await expect(page.getByTestId('library-panel')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Select tool' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Connect tool' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Text tool' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open layout controls' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete selected item' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Insert connector' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Toggle arrange controls' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Toggle edge styling controls' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open quick start help' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore Backup' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import JSON' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible();

  await page.locator('[data-node-id="starter-sponsor"]').click();
  const nodeContext = page.getByTestId('node-context-toolbar');
  await expect(nodeContext).toBeVisible();
  await expect(nodeContext.getByRole('button', { name: 'Edit selected node' })).toBeVisible();
  await expect(nodeContext.getByRole('button', { name: 'Duplicate selected node' })).toBeVisible();
  await expect(nodeContext.getByRole('button', { name: 'Delete selected node' })).toBeVisible();
});

test('toolbar help control is keyboard focusable with visible focus state', async ({ page }) => {
  const helpButton = page.getByTestId('toolbar-help-open');
  await expect(helpButton).toBeVisible();

  let focused = false;
  for (let idx = 0; idx < 30; idx += 1) {
    await page.keyboard.press('Tab');
    if (await helpButton.evaluate((node) => node === document.activeElement)) {
      focused = true;
      break;
    }
  }
  expect(focused).toBe(true);

  const focusStyle = await helpButton.evaluate((node) => {
    const styles = window.getComputedStyle(node);
    return {
      outlineStyle: styles.outlineStyle,
      outlineWidth: styles.outlineWidth
    };
  });

  expect(focusStyle.outlineStyle).not.toBe('none');
  expect(parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(1);
});

test('advanced disclosure controls are keyboard operable with aria state', async ({ page }) => {
  const arrangeToggle = page.getByRole('button', { name: 'Toggle arrange controls' });
  await expect(arrangeToggle).toBeVisible();
  await expect(arrangeToggle).toHaveAttribute('aria-expanded', 'false');

  await arrangeToggle.focus();
  await page.keyboard.press('Enter');
  await expect(arrangeToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('toolbar-arrange-panel')).toBeVisible();

  const edgeToggle = page.getByRole('button', { name: 'Toggle edge styling controls' });
  await edgeToggle.focus();
  await edgeToggle.press('Space');
  await expect(edgeToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('toolbar-edge-panel')).toBeVisible();
});
