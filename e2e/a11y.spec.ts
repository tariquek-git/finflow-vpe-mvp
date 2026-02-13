import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const clickNodeByLabel = async (page: Page, label: string) => {
  const locator = page.locator('div.group.absolute').filter({ hasText: label }).first();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Could not find node bounding box for ${label}`);
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};

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
  await expect(page.getByRole('button', { name: 'Select tool' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Connect tool' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Text tool' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open layout controls' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Insert connector' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open quick start help' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore Backup' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import JSON' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible();

  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.getByRole('button', { name: 'Delete selected item' })).toBeVisible();
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
