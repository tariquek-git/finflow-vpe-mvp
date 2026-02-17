import { expect, test, type Download, type Page } from '@playwright/test';
import { insertStarterTemplate } from './helpers/diagramSetup';

const openFileMenu = async (page: Page) => {
  const strip = page.getByTestId('primary-actions-strip').first();
  const menu = strip.getByTestId('toolbar-file-menu');
  if (await menu.isVisible()) {
    return menu;
  }
  const trigger = strip.getByTestId('toolbar-file-trigger');
  await trigger.click();
  await expect(menu).toBeVisible();
  return menu;
};

const clickNodeByLabel = async (page: Page, label: string) => {
  const locator = page.locator('div.group.absolute').filter({ hasText: label }).first();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Could not find node bounding box for ${label}`);
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};

const readDownloadText = async (download: Download): Promise<string> => {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Could not read download stream.');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

const activeWorkspaceId = async (page: Page) => {
  const id = await page.evaluate(() => window.sessionStorage.getItem('fof:active-workspace-id') || '');
  return id.trim();
};

const importDiagramText = async (page: Page, jsonText: string) => {
  await page.locator('input[type="file"][accept*="json"]').first().setInputFiles({
    name: 'workspace-import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(jsonText, 'utf8')
  });
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await insertStarterTemplate(page);
});

test('two workspaces with the same name stay isolated across refresh', async ({ page }) => {
  const sharedName = 'Collision Diagram';

  const createWorkspace = async () => {
    page.once('dialog', (dialog) => dialog.accept(sharedName));
    const fileMenu = await openFileMenu(page);
    await fileMenu.getByTestId('toolbar-new-workspace').click();
    await expect(page.getByTestId('workspace-display')).toContainText(sharedName);
    await insertStarterTemplate(page);
  };

  const setSponsorNotes = async (text: string) => {
    await clickNodeByLabel(page, 'Sponsor Bank');
    const notes = page.locator('#node-field-notes');
    await expect(notes).toBeVisible();
    await notes.fill(text);
    await notes.blur();
    await expect(notes).toHaveValue(text);
  };

  await createWorkspace();
  const workspaceAId = await activeWorkspaceId(page);
  await setSponsorNotes('alpha-workspace-notes');

  await createWorkspace();
  const workspaceBId = await activeWorkspaceId(page);
  expect(workspaceBId).not.toBe(workspaceAId);
  await setSponsorNotes('beta-workspace-notes');
  const workspaceBShortId = workspaceBId.slice(-6).toUpperCase();

  const exportMenu = await openFileMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportMenu.getByTestId('toolbar-export-json').click()
  ]);
  const exportedText = await readDownloadText(download);
  const exportedPayload = JSON.parse(exportedText) as {
    workspaceId?: string;
    shortWorkspaceId?: string;
    name?: string;
    schemaVersion?: number;
    createdAt?: string;
    updatedAt?: string;
  };
  expect(exportedPayload.workspaceId).toBe(workspaceBId);
  expect(exportedPayload.shortWorkspaceId).toBe(workspaceBShortId);
  expect(exportedPayload.name).toBe(sharedName);
  expect(exportedPayload.schemaVersion).toBe(4);
  expect(typeof exportedPayload.createdAt).toBe('string');
  expect(typeof exportedPayload.updatedAt).toBe('string');

  const openWorkspace = async (workspaceId: string) => {
    const fileMenu = await openFileMenu(page);
    await fileMenu
      .locator(`[data-testid="toolbar-open-workspace"][data-workspace-id="${workspaceId}"]`)
      .first()
      .click();
    await expect.poll(async () => activeWorkspaceId(page)).toBe(workspaceId);
  };

  await openWorkspace(workspaceAId);
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.locator('#node-field-notes')).toHaveValue('alpha-workspace-notes');

  await openWorkspace(workspaceBId);
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.locator('#node-field-notes')).toHaveValue('beta-workspace-notes');

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect.poll(async () => activeWorkspaceId(page)).toBe(workspaceBId);
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.locator('#node-field-notes')).toHaveValue('beta-workspace-notes');

  await openWorkspace(workspaceAId);
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.locator('#node-field-notes')).toHaveValue('alpha-workspace-notes');
});

test('importing an existing workspace id defaults to create copy instead of overwrite', async ({ page }) => {
  const workspaceName = 'Import Safety';

  page.once('dialog', (dialog) => dialog.accept(workspaceName));
  const initialMenu = await openFileMenu(page);
  await initialMenu.getByTestId('toolbar-new-workspace').click();
  await insertStarterTemplate(page);

  await clickNodeByLabel(page, 'Sponsor Bank');
  const notesInput = page.locator('#node-field-notes');
  await notesInput.fill('original-workspace-note');
  await notesInput.blur();
  await expect(notesInput).toHaveValue('original-workspace-note');

  const originalWorkspaceId = await activeWorkspaceId(page);
  const exportMenu = await openFileMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportMenu.getByTestId('toolbar-export-json').click()
  ]);
  const exportedText = await readDownloadText(download);

  page.once('dialog', (dialog) => dialog.accept(''));
  await importDiagramText(page, exportedText);
  await expect(page.getByTestId('toast-message').last()).toContainText('Imported as copy');

  const copiedWorkspaceId = await activeWorkspaceId(page);
  expect(copiedWorkspaceId).not.toBe(originalWorkspaceId);

  const openWorkspace = async (workspaceId: string) => {
    const fileMenu = await openFileMenu(page);
    await fileMenu
      .locator(`[data-testid="toolbar-open-workspace"][data-workspace-id="${workspaceId}"]`)
      .first()
      .click();
    await expect.poll(async () => activeWorkspaceId(page)).toBe(workspaceId);
  };

  await openWorkspace(originalWorkspaceId);
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.locator('#node-field-notes')).toHaveValue('original-workspace-note');
});
