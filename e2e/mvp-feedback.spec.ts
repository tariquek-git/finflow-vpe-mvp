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

test('export shows success toast', async ({ page }) => {
  await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export JSON/i }).click()
  ]);

  await expect(page.getByTestId('toast-message').filter({ hasText: 'Diagram exported successfully.' })).toBeVisible();
});

test('reset shows success toast after backup save', async ({ page }) => {
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('toolbar-reset-canvas').click();

  await expect(
    page.getByTestId('toast-message').filter({ hasText: 'Canvas reset to starter template. Backup saved.' })
  ).toBeVisible();
});

test('import valid JSON shows success toast', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export JSON/i }).click()
  ]);
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Could not read download stream');

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const exportedJson = Buffer.concat(chunks).toString('utf8');

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import JSON/i }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'valid-finflow-export.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportedJson, 'utf8')
  });

  await expect(
    page.getByTestId('toast-message').filter({ hasText: 'Diagram imported successfully. Backup saved.' })
  ).toBeVisible();
});
