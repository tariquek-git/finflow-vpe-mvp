import { expect, test, type Download, type Page } from '@playwright/test';
import { insertStarterTemplate } from './helpers/diagramSetup';

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
  await insertStarterTemplate(page);
});

test('mvp happy path: edit, export, reset, import', async ({ page }) => {
  const initialEdgeCount = await countEdges(page);

  await page.locator(CONNECTOR_SELECTOR).click();
  await expect.poll(async () => countEdges(page)).toBe(initialEdgeCount + 1);
  const editedEdgeCount = initialEdgeCount + 1;

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (await openFileMenu(page)).getByTestId('toolbar-export-json').click()
  ]);

  await expect(download.suggestedFilename()).toMatch(/^finflow-diagram-(?:[A-Z0-9]+-)?\d+\.json$/);
  const exportedText = await readDownloadText(download);
  const exportedPayload = JSON.parse(exportedText) as {
    version?: number;
    diagram?: { nodes?: unknown[]; edges?: unknown[] };
  };

  expect([2, 3, 4]).toContain(exportedPayload.version);
  expect(Array.isArray(exportedPayload.diagram?.nodes)).toBe(true);
  expect(Array.isArray(exportedPayload.diagram?.edges)).toBe(true);
  expect(exportedPayload.diagram?.edges?.length).toBe(editedEdgeCount);

  page.once('dialog', (dialog) => dialog.accept());
  const resetMenu = await openFileMenu(page);
  await resetMenu.getByTestId('toolbar-reset-canvas').click();
  await expect.poll(async () => countEdges(page)).toBe(0);

  const fileChooserPromise = page.waitForEvent('filechooser');
  const importMenu = await openFileMenu(page);
  await importMenu.getByTestId('toolbar-import-json').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'mvp-export.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportedText, 'utf8')
  });

  await expect.poll(async () => countEdges(page)).toBe(editedEdgeCount);
});
