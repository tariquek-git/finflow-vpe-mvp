import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('public MVP hides AI generate controls by default', async ({ page }) => {
  await expect(page.getByTestId('ai-disabled-badge')).toBeVisible();
  await expect(page.getByPlaceholder('Describe a flow to generate...')).toHaveCount(0);
});

test('restore without backup shows non-blocking guidance toast', async ({ page }) => {
  await page.getByTestId('toolbar-restore').click();
  await expect(page.getByTestId('toast-message').first()).toContainText('No recovery snapshot yet');
});

test('invalid import shows non-blocking error toast', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import JSON/i }).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles({
    name: 'not-a-finflow-export.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"broken":true', 'utf8')
  });

  await expect(page.getByTestId('toast-message').first()).toContainText('Import failed');
});
