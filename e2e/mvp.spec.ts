import { expect, test, type Download, type Page } from '@playwright/test';

const EDGE_SELECTOR = 'svg g.cursor-pointer.group';
const CONNECTOR_SELECTOR = '[data-testid="toolbar-insert-connector"]';

const countEdges = async (page: Page) => {
  return page.locator(EDGE_SELECTOR).count();
};

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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('mvp happy path: edit, export, reset, import', async ({ page }) => {
  const initialEdgeCount = await countEdges(page);

  await page.locator(CONNECTOR_SELECTOR).click();
  await expect.poll(async () => countEdges(page)).toBe(initialEdgeCount + 1);
  const editedEdgeCount = initialEdgeCount + 1;

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export JSON/i }).click()
  ]);

  await expect(download.suggestedFilename()).toMatch(/^finflow-diagram-\d+\.json$/);
  const exportedText = await readDownloadText(download);
  const exportedPayload = JSON.parse(exportedText) as {
    version?: number;
    diagram?: { nodes?: unknown[]; edges?: unknown[] };
  };

  expect(exportedPayload.version).toBe(2);
  expect(Array.isArray(exportedPayload.diagram?.nodes)).toBe(true);
  expect(Array.isArray(exportedPayload.diagram?.edges)).toBe(true);
  expect(exportedPayload.diagram?.edges?.length).toBe(editedEdgeCount);

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-testid="toolbar-reset-canvas"]').click();
  await expect.poll(async () => countEdges(page)).toBe(initialEdgeCount);

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import JSON/i }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'mvp-export.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportedText, 'utf8')
  });

  await expect.poll(async () => countEdges(page)).toBe(editedEdgeCount);
});
