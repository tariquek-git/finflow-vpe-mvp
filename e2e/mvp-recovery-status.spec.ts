import { expect, test, type Download, type Page } from '@playwright/test';

const readDownloadText = async (download: Download): Promise<string> => {
  const stream = await download.createReadStream();
  if (!stream) {
    throw new Error('Could not read exported file stream.');
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
};

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

test('backup status and recency metadata stay accurate after reset/import/restore', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  const status = page.getByTestId('backup-status-indicator');
  await expect(status).toContainText(/Saving|Saved|Save failed/);
  await expect(status).toHaveAttribute('data-last-saved-at', '');

  page.once('dialog', (dialog) => dialog.accept());
  const resetMenu = await openFileMenu(page);
  await resetMenu.getByTestId('toolbar-reset-canvas').click();
  const resetSavedAt = await status.getAttribute('data-last-saved-at');
  expect(resetSavedAt).toBeTruthy();

  const exportMenu = await openFileMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportMenu.getByTestId('toolbar-export-json').click()
  ]);
  const exportedText = await readDownloadText(download);

  await page.waitForTimeout(1100);
  const chooserPromise = page.waitForEvent('filechooser');
  const importMenu = await openFileMenu(page);
  await importMenu.getByTestId('toolbar-import-json').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'recovery-status-export.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportedText, 'utf8')
  });

  const importSavedAt = await status.getAttribute('data-last-saved-at');
  expect(importSavedAt).toBeTruthy();
  expect(Date.parse(importSavedAt as string)).toBeGreaterThan(Date.parse(resetSavedAt as string));

  const restoreMenu = await openFileMenu(page);
  await restoreMenu.getByTestId('toolbar-restore').click();
  await expect(status).toHaveAttribute('data-last-saved-at', importSavedAt as string);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('backup-status-indicator')).toHaveAttribute(
    'data-last-saved-at',
    importSavedAt as string
  );
});
