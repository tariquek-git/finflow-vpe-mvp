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
  await expect(page.getByRole('button', { name: 'Select tool' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Connect tool' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Text tool' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open layout controls' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete selected item' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Insert connector' })).toBeVisible();
});
