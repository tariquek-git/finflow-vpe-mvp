import { expect, test, type Page } from '@playwright/test';

const openFileMenu = async (page: Page) => {
  const strip = page.getByTestId('primary-actions-strip').first();
  const menu = strip.getByTestId('toolbar-file-menu');
  if (await menu.isVisible()) {
    return menu;
  }
  const trigger = strip.getByTestId('toolbar-file-trigger');
  await trigger.click();
  try {
    await expect(menu).toBeVisible({ timeout: 1000 });
  } catch {
    await trigger.click();
  }
  await expect(menu).toBeVisible();
  return menu;
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('public MVP hides AI generate controls by default', async ({ page }) => {
  await expect(page.getByTestId('ai-disabled-badge')).toBeVisible();
  await expect(page.getByPlaceholder('Describe a flow to generate...')).toHaveCount(0);
});

test('restore without backup shows non-blocking guidance toast', async ({ page }) => {
  const menu = await openFileMenu(page);
  await menu.getByTestId('toolbar-restore').click();
  await expect(page.getByTestId('toast-message').first()).toContainText('No recovery snapshot yet');
});

test('invalid import shows non-blocking error toast', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  const menu = await openFileMenu(page);
  await menu.getByTestId('toolbar-import-json').click();
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
    (await openFileMenu(page)).getByTestId('toolbar-export-json').click()
  ]);

  await expect(page.getByTestId('toast-message').filter({ hasText: 'Diagram exported successfully.' })).toBeVisible();
});

test('reset shows success toast after backup save', async ({ page }) => {
  page.once('dialog', (dialog) => dialog.accept());
  const menu = await openFileMenu(page);
  await menu.getByTestId('toolbar-reset-canvas').click();

  await expect(
    page.getByTestId('toast-message').filter({ hasText: 'Canvas reset to blank. Backup saved.' })
  ).toBeVisible();
});

test('import valid JSON shows success toast', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (await openFileMenu(page)).getByTestId('toolbar-export-json').click()
  ]);
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Could not read download stream');

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const exportedJson = Buffer.concat(chunks).toString('utf8');

  const fileChooserPromise = page.waitForEvent('filechooser');
  const menu = await openFileMenu(page);
  await menu.getByTestId('toolbar-import-json').click();
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
