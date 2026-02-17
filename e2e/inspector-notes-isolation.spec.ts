import { expect, test, type Download, type Page } from '@playwright/test';
import { insertStarterTemplate } from './helpers/diagramSetup';

const clickNodeByLabel = async (page: Page, label: string) => {
  const locator = page.locator('div.group.absolute').filter({ hasText: label }).first();
  await expect(locator).toBeVisible({ timeout: 15000 });
  await locator.click();
};

const selectFirstEdge = async (page: Page) => {
  const edge = page.locator('g[data-edge-id]').first();
  await expect(edge).toBeVisible({ timeout: 15000 });
  await edge.dispatchEvent('click');
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Edge');
};

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

const readDownloadText = async (download: Download): Promise<string> => {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Could not read download stream.');

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

const importDiagramText = async (page: Page, jsonText: string) => {
  await page.locator('input[type="file"][accept*="json"]').first().setInputFiles({
    name: 'notes-roundtrip.json',
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

test('node documentation notes stay isolated from metadata tags', async ({ page }) => {
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Node');

  const metadataToggle = page
    .getByTestId('inspector-scroll-body')
    .getByRole('button', { name: 'Metadata' })
    .first();
  if ((await metadataToggle.getAttribute('aria-expanded')) === 'false') {
    await metadataToggle.click();
  }

  const notesInput = page.locator('#node-field-notes');
  const noteText = 'Operational runbook for settlement and triage.';
  await notesInput.fill(noteText);
  await page.locator('#node-field-tags').fill('ops,critical');
  await page.locator('#node-field-external-refs').fill('REF-1234');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(350);

  await expect(notesInput).toHaveValue(noteText);

  const fileMenu = await openFileMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    fileMenu.getByTestId('toolbar-export-json').click()
  ]);
  const exportedText = await readDownloadText(download);
  const payload = JSON.parse(exportedText) as {
    diagram?: { nodes?: Array<{ label?: string; description?: string; data?: { notes?: string } }> };
  };
  const sponsorNode = payload.diagram?.nodes?.find((node) => node.label === 'Sponsor Bank');

  expect(sponsorNode?.data?.notes).toBe(noteText);
  expect(sponsorNode?.data?.notes || '').not.toContain('tags=');

  page.once('dialog', (dialog) => dialog.accept());
  const resetMenu = await openFileMenu(page);
  await resetMenu.getByTestId('toolbar-reset-canvas').click();

  const importMenu = await openFileMenu(page);
  await importMenu.getByTestId('toolbar-import-json').click();
  await importDiagramText(page, exportedText);

  await clickNodeByLabel(page, 'Sponsor Bank');
  if ((await metadataToggle.getAttribute('aria-expanded')) === 'false') {
    await metadataToggle.click();
  }

  const importedNotesValue = await notesInput.inputValue();
  expect(importedNotesValue).toBe(noteText);
  expect(importedNotesValue).not.toContain('tags=');
  await expect(page.locator('#node-field-tags')).toHaveValue('ops,critical');
  await expect(page.locator('#node-field-external-refs')).toHaveValue('REF-1234');
});

test('edge notes are stored in edge.data.notes and survive export/import', async ({ page }) => {
  await selectFirstEdge(page);

  const edgeNotesInput = page.locator('#edge-field-notes');
  const edgeNoteText = 'Edge runbook: retry on timeout, escalate after 3 failures.';
  await edgeNotesInput.fill(edgeNoteText);
  await edgeNotesInput.blur();

  const fileMenu = await openFileMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    fileMenu.getByTestId('toolbar-export-json').click()
  ]);
  const exportedText = await readDownloadText(download);
  const payload = JSON.parse(exportedText) as {
    diagram?: { edges?: Array<{ id?: string; data?: { notes?: string } }> };
  };
  expect(payload.diagram?.edges?.[0]?.data?.notes).toBe(edgeNoteText);

  page.once('dialog', (dialog) => dialog.accept());
  const resetMenu = await openFileMenu(page);
  await resetMenu.getByTestId('toolbar-reset-canvas').click();
  const importMenu = await openFileMenu(page);
  await importMenu.getByTestId('toolbar-import-json').click();
  await importDiagramText(page, exportedText);

  await selectFirstEdge(page);
  await expect(edgeNotesInput).toHaveValue(edgeNoteText);
});

test('switching selection while typing notes commits to the original node only', async ({ page }) => {
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Node');

  const notesInput = page.locator('#node-field-notes');
  const sponsorNotes = 'Sponsor-only note should not leak to other nodes.';
  await notesInput.fill(sponsorNotes);

  await clickNodeByLabel(page, 'Processor');
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Node');

  const processorNotesInput = page.locator('#node-field-notes');
  await expect(processorNotesInput).toHaveValue('');

  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(notesInput).toHaveValue(sponsorNotes);
});
