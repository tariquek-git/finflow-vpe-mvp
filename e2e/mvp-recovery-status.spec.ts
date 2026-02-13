import { expect, test, type Download } from '@playwright/test';

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

test('backup status and recency metadata stay accurate after reset/import/restore', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');

  const status = page.getByTestId('backup-status-indicator');
  await expect(status).toContainText('Backup: Not yet created');
  await expect(status).toHaveAttribute('data-last-saved-at', '');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('toolbar-reset-canvas').click();
  await expect(status).toContainText('Backup: Available');
  await expect(status).toContainText('last saved');
  const resetSavedAt = await status.getAttribute('data-last-saved-at');
  expect(resetSavedAt).toBeTruthy();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('toolbar-export-json').click()
  ]);
  const exportedText = await readDownloadText(download);

  await page.waitForTimeout(1100);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('toolbar-import-json').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'recovery-status-export.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportedText, 'utf8')
  });

  await expect(status).toContainText('Backup: Available');
  await expect(status).toContainText('last saved');
  const importSavedAt = await status.getAttribute('data-last-saved-at');
  expect(importSavedAt).toBeTruthy();
  expect(Date.parse(importSavedAt as string)).toBeGreaterThan(Date.parse(resetSavedAt as string));

  await page.getByTestId('toolbar-restore').click();
  await expect(status).toContainText('Backup: Available');
  await expect(status).toHaveAttribute('data-last-saved-at', importSavedAt as string);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('backup-status-indicator')).toContainText('Backup: Available');
  await expect(page.getByTestId('backup-status-indicator')).toHaveAttribute(
    'data-last-saved-at',
    importSavedAt as string
  );
});
